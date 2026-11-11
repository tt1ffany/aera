import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
    index("routes/home.tsx"),
    route("visualizer/:id", "./routes/visualizer.$id.tsx"),
    route("share/:shareToken", "./routes/share.$shareToken.tsx")
] satisfies RouteConfig;
