import type { Route } from "./+types/home";
import Navbar from "../../components/Navbar";
import Upload from "../../components/Upload";
import { ArrowRight, Layers, Clock, ArrowUpRight } from "lucide-react";
import Button from "../../components/ui/Button";
import { useNavigate, useOutletContext } from "react-router";
import { useState, useRef, useEffect } from "react";
import {
  createProject,
  getProjects,
  getExampleProjects,
} from "../../lib/puter.action";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Aera" },
    { name: "description", content: "Welcome to Aera!" },
  ];
}

export default function Home() {
  type VisibilityFilter = "all" | "public" | "unlisted" | "private";

  const navigate = useNavigate();
  const { userId } = useOutletContext<AuthContext>();
  const [exampleProjects, setExampleProjects] = useState<DesignItem[]>([]);
  const [projects, setProjects] = useState<DesignItem[]>([]);
  const [visibilityFilter, setVisibilityFilter] = useState<VisibilityFilter>("all");
  const isCreatingProjectRef = useRef(false);

  const handleUploadComplete = async (base64Image: string) => {
    try {
      // Check if already currently creating the project
      if (isCreatingProjectRef.current) return false;
      isCreatingProjectRef.current = true;

      const newId = Date.now().toString();
      const name = `Residence ${newId}`;

      const newItem = {
        id: newId,
        name,
        sourceImage: base64Image,
        renderedImage: undefined,
        timestamp: Date.now(),
      };

      const saved = await createProject({
        item: newItem,
        visibility: "private",
      });
      if (!saved) {
        console.error("Failed to create project.");
        return false;
      }

      setProjects((prev) => [saved, ...prev]);

      navigate(`/visualizer/${newId}`, {
        state: {
          initialImage: saved.sourceImage,
          initialRender: saved.renderedImage || null,
          name,
        },
      });

      return true;
    } finally {
      isCreatingProjectRef.current = false;
    }
  };

  // Update projects state to display changes (e.g., new projects)
  useEffect(() => {
    let isCurrentRequest = true;
    setExampleProjects([]);
    setProjects([]);

    const fetchProjects = async () => {
      const userProjectsPromise: Promise<DesignItem[]> = userId
        ? getProjects()
        : Promise.resolve([]);

      const [examples, userProjects] = await Promise.all([
        getExampleProjects(),
        userProjectsPromise,
      ]);

      if (!isCurrentRequest) return;

      setExampleProjects(examples);
      setProjects(userProjects);
    };

    void fetchProjects();

    return () => {
      isCurrentRequest = false;
    };
  }, [userId]);

  return (
    <div className="home">
      <Navbar />

      <section className="hero">
        <h1>See the space beyond the lines</h1>

        <p className="subtitle">
          Aera transforms 2D floorplans into photorealsitc 3D visualizations,
          helping you explore architectural ideas before they become reality.
        </p>

        <div className="actions">
          <a href="#upload" className="cta">
            Start Building <ArrowRight className="icon" />
          </a>

          <Button variant="outline" size="lg" className="demo">
            Watch Demo
          </Button>
        </div>

        <div id="upload" className="upload-shell">
          <div className="grid-overlay" />

          <div className="upload-card">
            <div className="upload-head">
              <div className="upload-icon">
                <Layers className="icon" />
              </div>

              <h3>Upload your floor plan</h3>
              <p>Supports JPG, PNG, formats up to 10MB</p>
            </div>

            <Upload onComplete={handleUploadComplete} />
          </div>
        </div>
      </section>

      <section className="projects">
        <div className="section-inner">
          {/* Example Projects */}
          {exampleProjects.length > 0 && (
            <>
              <div className="section-head">
                <div className="copy">
                  <h2>Examples</h2>
                  <p>Checkout samples of Aera projects.</p>
                </div>
              </div>

              <div className="projects-grid">
                {exampleProjects.map((project) => {
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

                        <div className="badge">
                          <span>{"Example"}</span>
                        </div>
                      </div>

                      <div className="card-body">
                        <div>
                          <h3>{name}</h3>

                          <div className="meta">
                            <Clock size={12} />
                            <span>
                              {new Date(timestamp).toLocaleDateString()}
                            </span>
                            <span>By {project.ownerName || "Aera user"}</span>
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
            </>
          )}

          {/* Owner Projects */}
          {userId && (
            <div className="owner-projects">
              <div className="section-head">
                <div className="copy">
                  <h2>Your Projects</h2>
                  <p>Your latest works.</p>
                </div>

                <div className="">

                </div>
              </div>

              <div className="projects-grid">
                {userId &&
                  projects.map((project) => {
                    const { id, name, renderedImage, sourceImage, timestamp } =
                      project;
                    const visibility = project.visibility ?? "private";

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
                          <img
                            src={renderedImage || sourceImage}
                            alt="Project"
                          />

                          <div className="badge">
                            <span>
                              {visibility === "public"
                                ? "Public"
                                : visibility === "unlisted"
                                  ? "Unlisted"
                                  : "Private"}
                            </span>
                          </div>
                        </div>

                        <div className="card-body">
                          <div>
                            <h3>{name}</h3>

                            <div className="meta">
                              <Clock size={12} />
                              <span>
                                {new Date(timestamp).toLocaleDateString()}
                              </span>
                              <span>By {project.ownerName || "Aera user"}</span>
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
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
