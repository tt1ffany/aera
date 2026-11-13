import {
  useNavigate,
  useParams,
  useOutletContext,
  useSearchParams,
} from "react-router";
import { useState, useRef, useEffect } from "react";
import { generate3DDesign } from "../../lib/ai.action";
import { Box, X, Download, Share2, RefreshCcw } from "lucide-react";
import Button from "../../components/ui/Button";
import {
  createProject,
  getProjectById,
  updateProjectVisibility,
} from "../../lib/puter.action";
import {
  ReactCompareSlider,
  ReactCompareSliderImage,
} from "react-compare-slider";

const VisualizerId = () => {
  const { id } = useParams();
  const { userId } = useOutletContext<AuthContext>();
  const [searchParams] = useSearchParams();
  const ownerId = searchParams.get("ownerId");
  const navigate = useNavigate();

  const hasInitialGenerated = useRef(false);

  const [project, setProject] = useState<DesignItem | null>(null);
  const [isProjectLoading, setIsProjectLoading] = useState(true);

  const [isProcessing, setIsProcessing] = useState(false);
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [visibilityError, setVisibilityError] = useState<string | null>(null);
  const [pendingVisibility, setPendingVisibility] = useState<
    "private" | "unlisted" | "public" | null
  >(null);
  const [shareLinkStatus, setShareLinkStatus] = useState<
    "copied" | "error" | null
  >(null);
  const [comparisonAspectRatio, setComparisonAspectRatio] = useState("1 / 1");

  const handleBack = () => navigate("/");
  const handleExport = () => {
    if (!currentImage) return;

    const link = document.createElement("a");
    link.href = currentImage;
    link.download = `aera-${id || "design"}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const visibilityOptions: {
    value: "private" | "unlisted" | "public";
    label: string;
  }[] = [
    { value: "private", label: "Make private" },
    { value: "unlisted", label: "Make unlisted" },
    { value: "public", label: "Make public" },
  ];

  const runGeneration = async (item: DesignItem) => {
    if (!id || !item.sourceImage || (item.ownerId && item.ownerId !== userId))
      return;

    try {
      setIsProcessing(true);
      const result = await generate3DDesign({ sourceImage: item.sourceImage });

      if (result.renderedImage) {
        setCurrentImage(result.renderedImage);

        // Update the project with the rendered image in DB
        const updatedItem = {
          ...item,
          renderedImage: result.renderedImage,
          renderedPath: result.renderedPath,
          timestamp: Date.now(),
          ownerId: item.ownerId ?? userId ?? null,
          visibility: item.visibility ?? "private",
        };

        const saved = await createProject({
          item: updatedItem,
          visibility: item.visibility ?? "private",
        });

        if (saved) {
          setProject(saved);
          setCurrentImage(saved.renderedImage || result.renderedImage);
        }
      }
    } catch (error) {
      console.error("Generation failed: ", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const requestVisibilityChange = (
    nextVisibility: "private" | "unlisted" | "public",
  ) => {
    if (!project) return;

    const isMakingPrivateProjectShareable =
      (project.visibility === "private" &&
        (nextVisibility === "unlisted" || nextVisibility === "public")) ||
      (project.visibility === "unlisted" && nextVisibility === "public");

    if (isMakingPrivateProjectShareable) {
      setPendingVisibility(nextVisibility);
      return;
    }

    void changeVisibility(nextVisibility);
  };

  const changeVisibility = async (
    visibility: "private" | "unlisted" | "public",
  ) => {
    if (!project) return;
    setVisibilityError(null);

    const updatedProject = await updateProjectVisibility({
      id: project.id,
      visibility,
    });
    if (!updatedProject) {
      setVisibilityError(
        "Could not update project visibility. Please try again.",
      );
      return;
    }

    setProject(updatedProject);
    setPendingVisibility(null);
    setShareLinkStatus(null);
  };

  const copyShareLink = async () => {
    setShareLinkStatus(null);

    if (!project?.shareToken) {
      setShareLinkStatus("error");
      return;
    }

    const shareUrl = `${window.location.origin}/share/${encodeURIComponent(project.shareToken)}`;

    try {
      await navigator.clipboard.writeText(shareUrl);
      setShareLinkStatus("copied");
    } catch (error) {
      console.error("Failed to copy share link", error);
      setShareLinkStatus("error");
    }
  };

  // Load and display saved project by ID
  useEffect(() => {
    let isMounted = true;

    const loadProject = async () => {
      if (!id) {
        setIsProjectLoading(false);
        return;
      }

      setIsProjectLoading(true);

      const fetchedProject = await getProjectById({ id, ownerId });

      // Prevent a stale request from updating state after this effect is cleaned up
      if (!isMounted) return;

      setProject(fetchedProject);
      setCurrentImage(fetchedProject?.renderedImage || null);
      setIsProjectLoading(false);
      // Allow the initial render decision to run for the newly loaded project
      hasInitialGenerated.current = false;
    };

    loadProject();

    // Invalidate this request if the project ID changes or the component unmounts
    return () => {
      isMounted = false;
    };
  }, [id, ownerId, userId]);

  // Decide if image generation is required and what image to display once project is loaded
  useEffect(() => {
    // Wait for project loading to finish and avoid repeating the initial generation decision
    if (
      isProjectLoading ||
      hasInitialGenerated.current ||
      !project?.sourceImage
    ) {
      return;
    }

    // Reuse an existing render instead of generating it again
    if (project.renderedImage) {
      setCurrentImage(project.renderedImage);
      hasInitialGenerated.current = true;
      return;
    }

    if (!userId) return;
    if (project.ownerId && project.ownerId !== userId) {
      hasInitialGenerated.current = true;
      return;
    }

    hasInitialGenerated.current = true;
    void runGeneration(project);
  }, [project, isProjectLoading, userId]);

  const isOwner = !!userId && project?.ownerId === userId;
  const visibility = project?.visibility ?? "private";

  return (
    <div className="visualizer">
      <nav className="topbar">
        <div className="brand">
          <Box className="logo" />
          <span className="name">Aera</span>
        </div>
        <Button variant="ghost" size="sm" onClick={handleBack} className="exit">
          <X className="icon" /> Exit Editor
        </Button>
      </nav>

      <section className="content">
        <div className="panel">
          <div className="panel-header">
            <div className="panel-meta">
              <p>Project</p>
              <h2>{project?.name || `Residence ${id}`}</h2>
              <p className="note">
                {visibility === "public"
                  ? "Public project"
                  : visibility === "unlisted"
                    ? "Unlisted project"
                    : "Private project"}
              </p>
            </div>

            <div className="panel-actions">
              <Button
                size="sm"
                onClick={handleExport}
                className="export"
                disabled={!currentImage}
              >
                <Download className="w-4 h-4 mr-2" /> Export
              </Button>
              {!pendingVisibility &&
                isOwner &&
                visibility === "unlisted" &&
                project?.shareToken && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => void copyShareLink()}
                  >
                    <Share2 className="w-4 h-4 mr-2" />
                    Copy share link
                  </Button>
                )}
              {!pendingVisibility &&
                isOwner &&
                project &&
                visibilityOptions
                  .filter((option) => option.value !== visibility)
                  .map((option) => (
                    <Button
                      key={option.value}
                      size="sm"
                      className="share"
                      onClick={() => requestVisibilityChange(option.value)}
                    >
                      {option.label}
                    </Button>
                  ))}
              {pendingVisibility && (
                <>
                  <span>
                    Confirm changing visibility to {pendingVisibility}?
                  </span>
                  <Button
                    size="sm"
                    onClick={() => void changeVisibility(pendingVisibility)}
                  >
                    Confirm
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setPendingVisibility(null)}
                  >
                    Cancel
                  </Button>
                </>
              )}
            </div>
          </div>
          {visibilityError && (
            <p className="visibility-error">{visibilityError}</p>
          )}
          {shareLinkStatus && (
            <p
              className={`share-link-status ${
                shareLinkStatus === "copied" ? "is-success" : "is-error"
              }`}
              role={shareLinkStatus === "copied" ? "status" : "alert"}
            >
              {shareLinkStatus === "copied"
                ? "Share link copied to clipboard."
                : "Could not copy the share link. Please try again."}
            </p>
          )}

          <div className={`render-area ${isProcessing ? "is-processing" : ""}`}>
            {currentImage ? (
              <img src={currentImage} alt="AI Render" className="render-img" />
            ) : (
              <div className="render-placeholder">
                {project?.sourceImage && (
                  <img
                    src={project?.sourceImage}
                    alt="Original"
                    className="render-fallback"
                  />
                )}
              </div>
            )}

            {isProcessing && (
              <div className="render-overlay">
                <div className="rendering-card">
                  <RefreshCcw className="spinner" />
                  <span className="title">Rendering...</span>
                  <span className="subtitle">
                    Generating your 3D visualization
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="panel compare">
          <div className="panel-header">
            <div className="panel-meta">
              <p>Comparison</p>
              <h3>Before & After</h3>
            </div>
            <div className="compare-actions">
              {isOwner && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => project && void runGeneration(project)}
                  disabled={!project?.sourceImage || isProcessing}
                  className="regenerate"
                >
                  <RefreshCcw className="w-4 h-4 mr-2" />
                  Regenerate
                </Button>
              )}
              <div className="hint">Drag to compare</div>
            </div>
          </div>

          <div
            className="compare-stage"
            style={{ aspectRatio: comparisonAspectRatio }}
          >
            {project?.sourceImage && currentImage ? (
              <ReactCompareSlider
                defaultPosition={50}
                style={{ width: "100%", height: "100%" }}
                itemOne={
                  <ReactCompareSliderImage
                    src={project.sourceImage}
                    alt="Before"
                    className="compare-img"
                    style={{ objectFit: "contain" }}
                    onLoad={(event) => {
                      const { naturalWidth, naturalHeight } =
                        event.currentTarget;
                      if (naturalWidth && naturalHeight) {
                        setComparisonAspectRatio(
                          `${naturalWidth} / ${naturalHeight}`,
                        );
                      }
                    }}
                  />
                }
                itemTwo={
                  <ReactCompareSliderImage
                    src={currentImage}
                    alt="After"
                    className="compare-img"
                    style={{ objectFit: "contain" }}
                  />
                }
              />
            ) : (
              <div className="compare-fallback">
                {project?.sourceImage && (
                  <img
                    src={project.sourceImage}
                    alt="Before"
                    className="compare-img"
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default VisualizerId;
