import { Box } from "lucide-react";

const Navbar = () => {
  const handleLogin = async () => {};

  return (
    <header className="navbar">
      <div className="inner">
        <div className="left">
          <div className="brand">
            <Box className="logo" />
            <span className="name">Aera</span>
          </div>

          <ul className="links">
            <a href="#">Product</a>
            <a href="#">Pricing</a>
            <a href="#">Community</a>
            <a href="#">Enterprise</a>
          </ul>
        </div>

        <div className="actions">
          <button onClick={handleLogin} className="login">
            Log in
          </button>
          <a href="#upload" className="cta">
            Get Started
          </a>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
