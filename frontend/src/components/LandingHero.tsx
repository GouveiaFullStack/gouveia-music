import { Link } from "react-router";

function LandingHero() {
  return (
    <section>
      <div>
        <p>Descubra. Ouça. Compartilhe.</p>

        <h1>Sua música, do seu jeito.</h1>

        <p>
          Explore músicas, descubra artistas, crie playlists e encontre
          recomendações feitas para você.
        </p>

        <div>
          <Link to="/register">Começar agora</Link>
          <Link to="/login">Já tenho uma conta</Link>
        </div>
      </div>
    </section>
  );
}

export default LandingHero;
