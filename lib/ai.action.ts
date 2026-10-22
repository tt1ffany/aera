
import puter from "@heyputer/puter.js";
import { AERA_RENDER_PROMPT } from "./constants";

export const fetchAsDataUrl = async (url: string): Promise<string> => {
    // Fetch the image from its URL
    const response = await fetch(url);

    // fetch() doesn't reject on HTTP errors (e.g. 404), so check explicitly.
    if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText}`);
    }

    // Read the response body as binary data before converting it to a Data URL.
    const blob = await response.blob();

    // FileReader uses events rather than returning a Promise, so wrap it to make the result awaitable
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        // Resolve only when reading succeeds and produces a Data URL string
        reader.onload = () => {
            if (typeof reader.result === "string") {
                resolve(reader.result);
            } else {
                reject(new Error("Failed to read image as a Data URL"));
            }
        };

        // Propagate read failures to the caller.
        reader.onerror = () => {
            reject(reader.error ?? new Error("Failed to read image"));
        };

        // Start reading the Blob as a Base64-encoded Data URL.
        reader.readAsDataURL(blob);
    });
};

export const generate3DDesign = async ({ sourceImage }: Generate3DViewParams) => {
    // Normalize the input so the AI request receives image data in Data URL format
    const dataUrl = sourceImage.startsWith("data:")
        ? sourceImage
        : await fetchAsDataUrl(sourceImage);

    // Separate the Base64-encoded image data from the Data URL's metadata
    const base64Data = dataUrl.split(",")[1];
    const mimeType = dataUrl.split(";")[0].split(":")[1]; // Gets the type of the image

    if (!mimeType || !base64Data) throw new Error("Invalid source image payload");

    // Send the source image and rendering instructions to the selected AI model
    const response = await puter.ai.txt2img(AERA_RENDER_PROMPT, {
        provider: "gemini",
        model: "gemini-3.1-flash-image",
        input_image: base64Data,
        input_image_mime_type: mimeType,
        ratio: { w: 1024, h: 1024 }
    })

    // Extract the AI generated image URL from the response
    // This assumes Puter's response exposes an image element with a src property
    const rawImageUrl = (response as HTMLImageElement).src ?? null;

    if (!rawImageUrl) return { renderedImage: null, renderedPath: undefined };

    // Normalize the generated image to a Data URL for consistent downstream handling
    const renderedImage = rawImageUrl.startsWith("data:")
        ? rawImageUrl
        : await fetchAsDataUrl(rawImageUrl);

    return { renderedImage, renderedPath: undefined };
}

