import puter from "@heyputer/puter.js";
import { getOrCreateHostingConfig, uploadImageToHosting } from "./puter.hosting";
import { isHostedUrl } from "./utils";

export const signIn = async () => await puter.auth.signIn();

export const signOut = () => puter.auth.signOut();  

export const getCurrentUser = async () => {
    try {
        return await puter.auth.getUser();
    } catch {
        return null;
    }
}

export const createProject = async ({ item }: CreateProjectParams) : Promise<DesignItem | null | undefined> => {
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
        return payload;
    } catch (error) {
        console.log("Failed to save project", error);
        return null;
    }
}