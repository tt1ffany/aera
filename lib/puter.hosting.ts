import puter from "@heyputer/puter.js";
import { HOSTING_CONFIG_KEY, createHostingSlug, fetchBlobFromUrl, getHostedUrl, getImageExtension, imageUrlToPngBlob, isHostedUrl } from "./utils";

export const getOrCreateHostingConfig = async (): Promise<HostingConfig | null> => {
    const existing = (await puter.kv.get(HOSTING_CONFIG_KEY)) as HostingConfig | null;

    // If the subdomain exists, return an object set to that existing subdomain
    if (existing?.subdomain) return { subdomain: existing.subdomain };

    // If the subdomain doesn't exist, set up a new one
    const subdomain = createHostingSlug();

    try {
        // If successfully created subdomain, create a new Puter hosting
        const created = await puter.hosting.create(subdomain, '.');
        const record = { subdomain: created.subdomain };
        // Persist newly created subdomain to KV to ensure it can be recalled
        await puter.kv.set(HOSTING_CONFIG_KEY, record);
        return record;
    } catch (error) {
        console.warn(`Could not find subdomain: ${error}`);
        return null;
    }
}

export const uploadImageToHosting = async ({ hosting, url, projectId, label }: StoreHostedImageParams): Promise<HostedAsset | null> => {
    if (!hosting || !url) return null;
    if (isHostedUrl(url)) return { url };

    try {
        // Convert rendered images to PNG, or fetch the image data for other labels
        const resolved = label === "rendered" 
            ? await imageUrlToPngBlob(url)
                .then((blob) => blob ? { blob, contentType: 'image/png' }: null)
            : await fetchBlobFromUrl(url);

        if (!resolved) return null;

        const contentType = resolved.contentType || resolved.blob.type || '';
        const ext = getImageExtension(contentType, url);
        const dir = `projects/${projectId}`;
        const filePath = `${dir}/${label}.${ext}`;

        // Organize and upload the file (choose extension, create project folder, and write the file)
        const uploadFile = new File([resolved.blob], `${label}.${ext}`, {
            type: contentType,
        });

        await puter.fs.mkdir(dir, { createMissingParents: true });
        await puter.fs.write(filePath, uploadFile);

        const hostedUrl = getHostedUrl({ subdomain: hosting.subdomain }, filePath);
        return hostedUrl ? { url: hostedUrl } : null;
    } catch (error) {
        console.warn(`Failed to store the hosted image: ${error}`);
        return null;
    }
}
