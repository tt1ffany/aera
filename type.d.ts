interface AuthState {
    isSignedIn: boolean;
    username: string | null;
    userId: string | null;
}

type AuthContext = {
    isSignedIn: boolean;
    username: string | null;
    userId: string | null;
    refreshAuth: () => Promise<boolean>;
    signIn: () => Promise<boolean>;
    signOut: () => Promise<boolean>;
}

type HostingConfig = { subdomain: string };
type HostedAsset = { url: string };

interface StoreHostedImageParams {
    hosting: HostingConfig | null;
    url: string;
    projectId: string;
    label: "source" | "rendered";
}

interface DesignItem {
    id: string;
    name?: string | null;
    sourceImage: string;
    sourcePath?: string | null;
    renderedImage?: string | null;
    renderedPath?: string | null;
    publicPath?: string | null;
    timestamp: number;
    ownerId?: string | null;
    ownerName?: string | null;
    sharedBy?: string | null;
    sharedAt?: string | null;
    shareToken?: string | null;
    visibility?: "private" | "unlisted" | "public";
}

interface CreateProjectParams {
    item: DesignItem;
    visibility?: "private" | "unlisted" | "public";
}

interface Generate3DViewParams {
    sourceImage: string;
    projectId?: string | null;
}