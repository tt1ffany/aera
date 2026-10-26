const PROJECT_PREFIX = "aera_project_";

const jsonError = (status, message, extra = {}) => {
    new Response(JSON.stringify({ error: message, ...extra }), {
        status,
        headers: {
            "Content type": "application/json",
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

router.post("/api/projects/save", async ({ request, user }) => {
    try {
        // Authenticate user first
        const puterUser = user.puter;
        if (!puterUser) return jsonError(401, "Authentication failed");

        const body = await request.json();
        const project = body?.project;
        if (!project?.id || project?.sourceImage) return jsonError(400, "Project not found");

        const payload = {
            ...project,
            updatedAt: new Date().toISOString(),
        }

        const userId = await getUserId(puterUser);
        if(!userId) return jsonError(401, "Authentication failed");

        const key = `${PROJECT_PREFIX}${project.id}`;
        await puterUser.kv.set(key, payload);

        return { saved: true, id: project.id, project: payload }
    } catch (error) {
        return jsonError(500, "Failed to save project", { message: error.message || "Unknown error" });
    }
})

router.get("/api/projects/list", async ({ user }) => {
    try {
        // Authenticate user first
        const puterUser = user.puter;
        if (!puterUser) return jsonError(401, "Authentication failed");

        const userId = await getUserId(puterUser);
        if(!userId) return jsonError(401, "Authentication failed");

        // List all keys starting with the project prefix from KV store
        const projects = (await puterUser.kv.list(PROJECT_PREFIX, true)).map(({value}) => ({ ...value, isPublic: true }))

        return { projects };
    } catch (error) {
        return jsonError(500, "Failed to list projects", { message: error.message || "Unknown error" });
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

        // Fetch specific project from KV store using extracted id
        const key = `${PROJECT_PREFIX}${project.id}`;
        const project = await puterUser.kv.get(key);
        if (!project) return jsonError(404, "Project not found");

        return { project };
    } catch (error) {
        return jsonError(500, "Failed to get project", { message: error.message || "Unknown error" });
    }
})