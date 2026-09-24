import { Link } from "react-router";

function RegisterPage() {
  return (
    <main>
      <h1>Criar conta</h1>

      <p>O formulário de cadastro será criado aqui.</p>

      <Link to="/">Voltar para a página inicial</Link>
    </main>
  );
}

export default RegisterPage;
