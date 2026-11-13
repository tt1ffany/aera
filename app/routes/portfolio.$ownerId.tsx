import { useParams, useNavigate } from "react-router";
import { useState, useEffect } from "react";
import { getOwnerPublicProjects } from "../../lib/puter.action";
import { Box, X, Clock, ArrowUpRight, RefreshCcw } from "lucide-react";
import Button from "../../components/ui/Button";

const Portfolio = () => {
  const { ownerId } = useParams();
  const navigate = useNavigate();

  const [projectList, setProjectList] = useState<DesignItem[]>([]);
  const [isLoading, setIsLoading] = useState(true); // Initialize as true so page doesn't look empty before effect starts

  const handleBack = () => navigate("/");

  useEffect(() => {
    let isMounted = true;

    const loadPublicProjects = async () => {
      setProjectList([]);

      if (!ownerId) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      const fetchPublicProjects = await getOwnerPublicProjects({ ownerId });

      if (!isMounted) return;

      setProjectList(fetchPublicProjects);
      setIsLoading(false);
    };

    void loadPublicProjects();

    return () => {
      isMounted = false;
    };
  }, [ownerId]);

  return (
    <div className="visualizer home">
      <nav className="topbar">
        <div className="brand">
          <Box className="logo" />
          <span className="name">Aera</span>
        </div>
        <Button variant="ghost" size="sm" onClick={handleBack} className="exit">
          <X className="icon" /> Home
        </Button>
      </nav>

      <section className="projects w-full">
        <div className="section-inner">
          <div className="section-head">
            <div className="copy">
              <h2>Projects</h2>
              {/* <p>
                Your latest works and shared community projects, all in one
                place.
              </p> */}
            </div>
          </div>

          {isLoading ? (
            <div className="projects-grid">
              <div className="empty" role="status">
                <RefreshCcw className="mx-auto mb-3 h-5 w-5 animate-spin text-primary" />
                <p>Loading portfolio projects...</p>
              </div>
            </div>
          ) : projectList.length > 0 ? (
            <div className="projects-grid">
              {projectList.map((project) => {
                const { id, name, renderedImage, sourceImage, timestamp } =
                  project;

                return (
                  <div
                    key={`${project.ownerId}_${id}`}
                    className="project-card group"
                    onClick={() =>
                      navigate(
                        `/visualizer/${id}?ownerId=${encodeURIComponent(project.ownerId || "")}`,
                      )
                    }
                  >
                    <div className="preview">
                      <img src={renderedImage || sourceImage} alt="Project" />

                      {/* <div className="badge">
                      <span>{visibility === "public" ? "Public" : visibility === "unlisted" ? "Unlisted" : "Private"}</span>
                    </div> */}
                    </div>

                    <div className="card-body">
                      <div>
                        <h3>{name}</h3>

                        <div className="meta">
                          <Clock size={12} />
                          <span>
                            {new Date(timestamp).toLocaleDateString()}
                          </span>
                          <span>By Tiffany</span>
                        </div>
                      </div>

                      <div className="arrow">
                        <ArrowUpRight size={18} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="projects-grid">
              <div className="empty">
                <p>No public projects yet.</p>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default Portfolio;
