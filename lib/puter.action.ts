import puter from "@heyputer/puter.js";
import { getOrCreateHostingConfig, uploadImageToHosting } from "./puter.hosting";
import { isHostedUrl } from "./utils";
import { PUTER_WORKER_URL } from "./constants";

export const signIn = async () => await puter.auth.signIn();

export const signOut = () => puter.auth.signOut();  

export const getCurrentUser = async () => {
    try {
        return await puter.auth.getUser();
    } catch {
        return null;
    }
}

export const createProject = async ({ item, visibility = "private" }: CreateProjectParams) : Promise<DesignItem | null | undefined> => {
    if (!PUTER_WORKER_URL) {
        console.warn("Missing VITE_PUTER_WORKER_URL; skip history fetch");
        return null;
    }
    
    const projectId = item.id;

    const hosting = await getOrCreateHostingConfig(); // Prepare hosting configuration

    // Host the original "before" image if a project ID exists
    const hostedSource = projectId ? await uploadImageToHosting({
        hosting, url: item.sourceImage, projectId, label: "source",
    }) : null;

    // Host the rendered "after" image only if both the project ID and a rendered image exist
    const hostedRender = projectId && item.renderedImage ? await uploadImageToHosting({
        hosting, url: item.renderedImage, projectId, label: "rendered",
    }) : null;

    // Choose URL to use for the original image and rendered image:
    // Prefer the URL returned by the hosting function, otherwise reuse the original URL if already hosted
    // Source image
    const resolvedSource = hostedSource?.url || (isHostedUrl(item.sourceImage) ? item.sourceImage : '');
    // Original image is required to save a project
    if (!resolvedSource) {
        console.warn("Failed to host source image, skipping save.");
        return null;
    }

    // Rendered image (a rendered image is optional)
    const resolvedRender = hostedRender?.url ? hostedRender?.url : item.renderedImage && isHostedUrl(item.renderedImage) ? item.renderedImage : undefined;

    const {
        sourcePath: _sourcePath,
        renderedPath: _renderedPath,
        publicPath: _publicPath,
        ... rest
    } = item;

    // Only use the meaningful items for payload object to be sent over to Puter
    const payload = {
        ... rest,
        sourceImage: resolvedSource,
        renderedImage: resolvedRender,
    }

    try {
        // Call the Puter worker to store project
        const response = await puter.workers.exec(`${PUTER_WORKER_URL}/api/projects/save`, { 
            method: "POST",
            body: JSON.stringify({ project: payload, visibility })
        });

        if (!response.ok) {
            console.error("Failed to save project", await response.text());
            return null;
        }

        const data = (await response.json()) as { project?: DesignItem | null }

        return data?.project ?? null;
    } catch (error) {
        console.log("Failed to save project", error);
        return null;
    }
}

export const getProjects = async () => {
    if (!PUTER_WORKER_URL) {
        console.warn("Missing VITE_PUTER_WORKER_URL; skip history fetch");
        return [];
    }

    try {
       // Fetch all the projects user has created
       // Use Puter work and .exec() (execute) with endpoint
       const response = await puter.workers.exec(`${PUTER_WORKER_URL}/api/projects/list`, { method: "GET" });
       if (!response.ok) {
            console.error("Failed to fetch history", await response.text());
            return [];
       }

       const data = (await response.json()) as { projects?: DesignItem[] | null };

       return Array.isArray(data?.projects) ? data?.projects : [];
    } catch (error) {
        console.error("Failed to get projects", error);
        return [];
    }
}

export const getProjectById = async ({ id } : { id: string }) => {
    if (!PUTER_WORKER_URL) {
        console.warn("Missing VITE_PUTER_WORKER_URL; skipping project fetch.");
        return null;
    }

    console.log("Fetching project with ID:", id);

    try {
        const response = await puter.workers.exec(
            `${PUTER_WORKER_URL}/api/projects/get?id=${encodeURIComponent(id)}`,
            { method: "GET" },
        );

        console.log("Fetch project response:", response);

        if (!response.ok) {
            console.error("Failed to fetch project:", await response.text());
            return null;
        }

        const data = (await response.json()) as {
            project?: DesignItem | null;
        };

        console.log("Fetched project data:", data);

        return data?.project ?? null;
    } catch (error) {
        console.error("Failed to fetch project:", error);
        return null;
    }
}