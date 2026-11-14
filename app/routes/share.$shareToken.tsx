import { useParams, useNavigate } from "react-router";
import { useState, useEffect } from "react";
import { getUnlistedProject } from "../../lib/puter.action";
import { Box, X, RefreshCcw } from "lucide-react";
import Button from "../../components/ui/Button";
import {
  ReactCompareSlider,
  ReactCompareSliderImage,
} from "react-compare-slider";

const ShareToken = () => {
  const { shareToken } = useParams();
  const navigate = useNavigate();

  const [unlistedProject, setUnlistedProject] = useState<DesignItem | null>(
    null,
  );
  const [isProjectLoading, setIsProjectLoading] = useState(true);
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [comparisonAspectRatio, setComparisonAspectRatio] = useState("1 / 1");

  const handleBack = () => navigate("/");

  useEffect(() => {
    let isMounted = true;

    const loadUnlistedProject = async () => {
      // Don't leave an old project's information visible while loading another link
      setUnlistedProject(null);
      setCurrentImage(null);

      if (!shareToken) {
        setIsProjectLoading(false);
        return;
      }

      setIsProjectLoading(true);

      const fetchedUnlistedProject = await getUnlistedProject({ shareToken });

      // The page may have changed or unmounted while the request was in progress
      if (!isMounted) return;

      setUnlistedProject(fetchedUnlistedProject);
      setCurrentImage(fetchedUnlistedProject?.renderedImage || null);
      setIsProjectLoading(false);
    };

    void loadUnlistedProject();

    // A late request can't update state after the page changes or unmounts
    return () => {
      isMounted = false;
    };
  }, [shareToken]);

  return (
    <div className="visualizer">
      <nav className="topbar">
        <div className="brand">
          <Box className="logo" />
          <span className="name">Aera</span>
        </div>
        <Button variant="ghost" size="sm" onClick={handleBack} className="exit">
          <X className="icon" /> Home
        </Button>
      </nav>

      {isProjectLoading ? (
        <section className="content">
          <div className="panel">
            <div className="panel-header">
              <div className="panel-meta">
                <RefreshCcw className="spinner" />
                <h2>Loading project...</h2>
                <p className="note">
                  Please wait while we load the shared project.
                </p>
              </div>
            </div>
          </div>
        </section>
      ) : !unlistedProject ? (
        <section className="content">
          <div className="panel">
            <div className="panel-header">
              <div className="panel-meta">
                <h2>Link unavailable</h2>
                <p className="note">
                  This link is invalid or the project is no longer shared.
                </p>
              </div>
            </div>
          </div>
        </section>
      ) : (
        <section className="content">
          <div className="panel">
            <div className="panel-header">
              <div className="panel-meta">
                <p>Project</p>
                <h2>
                  {unlistedProject?.name || `Residence ${unlistedProject?.id}`}
                </h2>
                <p className="note">
                  Unlisted Project | By {unlistedProject.ownerName || "Aera user"}
                </p>
              </div>
            </div>

            <div
              className={`render-area ${isProjectLoading ? "is-project-loading" : ""}`}
            >
              {currentImage ? (
                <img
                  src={currentImage}
                  alt="AI Render"
                  className="render-img"
                />
              ) : (
                <div className="render-placeholder">
                  {unlistedProject?.sourceImage && (
                    <img
                      src={unlistedProject?.sourceImage}
                      alt="Original"
                      className="render-fallback"
                    />
                  )}
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
                <div className="hint">Drag to compare</div>
              </div>
            </div>

            <div
              className="compare-stage"
              style={{ aspectRatio: comparisonAspectRatio }}
            >
              {unlistedProject?.sourceImage && currentImage ? (
                <ReactCompareSlider
                  defaultPosition={50}
                  style={{ width: "100%", height: "100%" }}
                  itemOne={
                    <ReactCompareSliderImage
                      src={unlistedProject.sourceImage}
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
                  {unlistedProject?.sourceImage && (
                    <img
                      src={unlistedProject.sourceImage}
                      alt="Before"
                      className="compare-img"
                    />
                  )}
                </div>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

export default ShareToken;
