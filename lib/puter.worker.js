const PROJECT_PREFIX = "aera_project_";
const PUBLIC_PROJECT_PREFIX = "aera_public_project_";
const UNLISTED_PROJECT_PREFIX = "aera_unlisted_project_";

const jsonError = (status, message, extra = {}) => {
    return new Response(JSON.stringify({ error: message, ...extra }), {
        status,
        headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
        }
    })
}

const getUserId = async (puterUser) => {
    try {
        const user = await puterUser.auth.getUser();
        return user?.uuid || null;
    } catch (error) {
        return null;
    }
}

const normalizeProject = (project, ownerId) => ({
    ...project,
    // Use the authenticated/key owner rather than trusting ownerId stored in the project payload
    ownerId,
    // Older saved projects or invalid values default to private, while valid unlisted values are preserved
    visibility: project.visibility === "public" ? "public" 
        : project.visibility === "unlisted" ? "unlisted"
        : "private",
});

const listPublicProjects = async () => {
    const entries = await me.puter.kv.list(PUBLIC_PROJECT_PREFIX, true);
    return entries
        .map(({ value }) => value)
        // Treat the catalog as an index, not the authority: only explicitly public records are exposed
        .filter((project) => project?.visibility === "public");
}

const updatePublicProject = async (key, project, visibility) => {
    if (visibility === "public") {
        // Callers cannot read an owner's private KV, so public projects need a worker-owned copy
        await me.puter.kv.set(key, project);
        return;
    }

    const existingProject = await me.puter.kv.get(key);
    if (existingProject?.visibility === "public") {
        // Mark it private before removal so an interrupted update fails closed for public reads
        await me.puter.kv.set(key, { ...existingProject, visibility: "private" });
    }
    await me.puter.kv.del(key);
}

const generateShareToken = (visibility, existingProject) => {
    // If new visibility provided is not unlisted, return null to clear the token
    if (visibility !== "unlisted") return null;

    // Reuse existing token if project remains unlisted and the token is still valid
    if (existingProject?.visibility === "unlisted" && existingProject?.shareToken) {
        return existingProject.shareToken;
    }

    return crypto.randomUUID();
}

const removeOldUnlistedLink = async (existingProject, updatedProject) => {
    if (existingProject?.visibility !== "unlisted" || !existingProject.shareToken) return;

    // Keep the index entry when the project stays unlisted with the same link
    if (updatedProject.visibility === "unlisted" && updatedProject.shareToken === existingProject.shareToken) return;

    await me.puter.kv.del(`${UNLISTED_PROJECT_PREFIX}${existingProject.shareToken}`);
}

const saveUnlistedProject = async (updatedProject) => {
    if (updatedProject.visibility !== "unlisted") return;

    if (!updatedProject.shareToken) throw new Error("Unlisted project is missing a share token");

    // Index by token so a link can find this project without listing it publicly
    await me.puter.kv.set(`${UNLISTED_PROJECT_PREFIX}${updatedProject.shareToken}`, updatedProject);
}

router.post("/api/projects/save", async ({ request, user }) => {
    try {
        // Authenticate user first
        const puterUser = user.puter;
        if (!puterUser) return jsonError(401, "Authentication failed");

        const body = await request.json();
        const project = body?.project;
        if (!project?.id || !project?.sourceImage) return jsonError(400, "Project not found");
        const visibility = body.visibility ?? project.visibility ?? "private";
        if (visibility !== "private" && visibility !== "unlisted" && visibility !== "public") {
            return jsonError(400, "Visibility must be private, unlisted, or public");
        }

        const userId = await getUserId(puterUser);
        if(!userId) return jsonError(401, "Authentication failed");

        const key = `${PROJECT_PREFIX}${userId}_${project.id}`;
        const publicKey = `${PUBLIC_PROJECT_PREFIX}${userId}_${project.id}`;

        const existingProject = await puterUser.kv.get(key) || await puterUser.kv.get(`${PROJECT_PREFIX}${project.id}`);
        
        const shareToken = generateShareToken(visibility, existingProject);

        const payload = normalizeProject({
            ...project,
            visibility,
            shareToken,
            updatedAt: new Date().toISOString(),
        }, userId);

        await removeOldUnlistedLink(existingProject, payload);
        
        // Remove the shared copy before saving private; publish only after the owner's record is saved
        if (visibility === "private" || visibility === "unlisted") await updatePublicProject(publicKey, payload, visibility);
        await puterUser.kv.set(key, payload);

        await saveUnlistedProject(payload);

        if (visibility === "public") await updatePublicProject(publicKey, payload, visibility);

        return { saved: true, id: project.id, project: payload }
    } catch (error) {
        return jsonError(500, "Failed to save project", { message: error.message || "Unknown error" });
    }
})

router.get("/api/projects/public-list", async () => {
    try {
        return { projects: await listPublicProjects() };
    } catch (error) {
        return jsonError(500, "Failed to list public projects", { message: error.message || "Unknown error" });
    }
})

router.get("/api/projects/list", async ({ user }) => {
    try {
        const puterUser = user.puter;
        if (!puterUser) return jsonError(401, "Authentication failed");
        const userId = await getUserId(puterUser);
        if(!userId) return jsonError(401, "Authentication failed");

        const userProjectPrefix = `${PROJECT_PREFIX}${userId}_`;
        // Read this user's whole project namespace so their older, unscoped keys remain accessible
        const projectEntries = await puterUser.kv.list(PROJECT_PREFIX, true);
        const legacyProjects = projectEntries
            .filter(({ key }) => !key.startsWith(userProjectPrefix))
            // Legacy keys were stored in the caller's own KV, which identifies their owner
            .map(({ value }) => normalizeProject(value, userId));
        const ownedProjects = projectEntries
            .filter(({ key }) => key.startsWith(userProjectPrefix))
            .map(({ value }) => normalizeProject(value, userId));
        const publicProjects = await listPublicProjects();
        const projectsByKey = new Map();

        // Add private user records last so they win over the same project in the shared catalog
        for (const project of [...publicProjects, ...legacyProjects, ...ownedProjects]) {
            projectsByKey.set(`${project.ownerId}_${project.id}`, project);
        }

        return { projects: Array.from(projectsByKey.values()) };
    } catch (error) {
        return jsonError(500, "Failed to list projects", { message: error.message || "Unknown error" });
    }
})

router.get("/api/projects/public-get", async ({ request }) => {
    try {
        const url = new URL(request.url);
        const id = url.searchParams.get("id");
        const ownerId = url.searchParams.get("ownerId");
        if (!id || !ownerId) return jsonError(400, "Project ID and owner ID are required");

        const key = `${PUBLIC_PROJECT_PREFIX}${ownerId}_${id}`;
        const project = await me.puter.kv.get(key);
        // The visibility check is enforced here, not just by hiding private projects in the UI
        if (!project || project.visibility !== "public") return jsonError(404, "Project not found");

        return { project: normalizeProject(project, ownerId) };
    } catch (error) {
        return jsonError(500, "Failed to get public project", { message: error.message || "Unknown error" });
    }
})

router.get("/api/projects/unlisted-get", async ({ request }) => {
    try {
        const url = new URL(request.url);
        
        const shareToken = url.searchParams.get("shareToken");
        if (!shareToken) return jsonError(400, "Share token is required");

        const unlistedProject = await me.puter.kv.get(`${UNLISTED_PROJECT_PREFIX}${shareToken}`);
        if (!unlistedProject || unlistedProject.visibility !== "unlisted" || unlistedProject.shareToken !== shareToken) return jsonError(404, "Unlisted project not found");

        return { project: normalizeProject(unlistedProject, unlistedProject.ownerId) };
    } catch (error) {
        return jsonError(500, "Failed to get unlisted project", { message: error.message || "Unknown error" });
    }
})

router.get("/api/projects/get", async ({ request, user }) => {
    try {
        // Authenticate user
        const puterUser = user.puter;
        if (!puterUser) return jsonError(401, "Authentication failed");

        const userId = await getUserId(puterUser);
        if(!userId) return jsonError(401, "Authentication failed");

        // Extract id from the request search parameters
        const url = new URL(request.url);
        const id = url.searchParams.get("id");
        if (!id) return jsonError(400, "Project ID is required");

        const ownerId = url.searchParams.get("ownerId") || userId;
        let project;
        if (ownerId === userId) {
            const key = `${PROJECT_PREFIX}${ownerId}_${id}`;
            // Fall back to the old key format for projects created before keys included the owner ID.
            project = await puterUser.kv.get(key) || await puterUser.kv.get(`${PROJECT_PREFIX}${id}`);
        } else {
            // Other users' projects are only readable through the worker's public catalog.
            const publicKey = `${PUBLIC_PROJECT_PREFIX}${ownerId}_${id}`;
            project = await me.puter.kv.get(publicKey);
        }

        if (!project) return jsonError(404, "Project not found");
        if (ownerId !== userId && project.visibility !== "public") {
            return jsonError(404, "Project not found");
        }

        return { project: normalizeProject(project, ownerId) };
    } catch (error) {
        return jsonError(500, "Failed to get project", { message: error.message || "Unknown error" });
    }
})

router.post("/api/projects/visibility", async ({ request, user }) => {
    try {
        const puterUser = user.puter;
        if (!puterUser) return jsonError(401, "Authentication failed");

        const userId = await getUserId(puterUser);
        if(!userId) return jsonError(401, "Authentication failed");

        const body = await request.json();
        const { id, visibility } = body || {};
        if (!id) return jsonError(400, "Project ID is required");
        if (visibility !== "private" && visibility !== "unlisted" && visibility !== "public") {
            return jsonError(400, "Visibility must be private, unlisted, or public");
        }

        const key = `${PROJECT_PREFIX}${userId}_${id}`;
        // Allow existing projects to change visibility; saving below moves a legacy key into the scoped format
        const existingProject = await puterUser.kv.get(key) || await puterUser.kv.get(`${PROJECT_PREFIX}${id}`);
        if (!existingProject) return jsonError(404, "Project not found");

        const shareToken = generateShareToken(visibility, existingProject);

        const project = normalizeProject({
            ...existingProject,
            visibility,
            shareToken,
            updatedAt: new Date().toISOString(),
        }, userId);

        await removeOldUnlistedLink(existingProject, project);

        const publicKey = `${PUBLIC_PROJECT_PREFIX}${userId}_${id}`;
        // Revoke public access before saving private, and expose the copy only after saving public
        if (visibility === "private" || visibility === "unlisted") await updatePublicProject(publicKey, project, visibility);
        await puterUser.kv.set(key, project);

        await saveUnlistedProject(project);

        if (visibility === "public") await updatePublicProject(publicKey, project, visibility);

        return { project };
    } catch (error) {
        return jsonError(500, "Failed to update project visibility", { message: error.message || "Unknown error" });
    }
})