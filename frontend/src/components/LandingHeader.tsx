import { Link } from "react-router";

function LandingHeader() {
  return (
    <header>
      <Link to="/">Mousiké</Link>

      <nav>
        <Link to="/login">Entrar</Link>
        <Link to="/register">Criar conta</Link>
      </nav>
    </header>
  );
}

export default LandingHeader;
