import React, { useState } from 'react';
import { Mail, Lock, LogIn, ShieldCheck } from 'lucide-react';

interface LoginProps {
  onLogin: (success: boolean, email: string) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (email === 'mentenexus.ia@gmail.com' && password === 'l57aJ965.') {
      onLogin(true, email);
    } else {
      setError('Credenciais inválidas. Tente novamente.');
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-card glass-card">
        <div className="login-header">
          <div className="logo-icon">
            <ShieldCheck size={40} color="var(--accent-color)" />
          </div>
          <h1>Mente Nexus</h1>
          <p>Portal Administrativo da Clínica</p>
        </div>

        <form onSubmit={handleLogin} className="login-form">
          <div className="input-group">
            <label>E-mail</label>
            <div className="input-with-icon">
              <Mail size={18} color="var(--text-secondary)" />
              <input 
                type="email" 
                placeholder="exemplo@gmail.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="input-group">
            <label>Senha</label>
            <div className="input-with-icon">
              <Lock size={18} color="var(--text-secondary)" />
              <input 
                type="password" 
                placeholder="********" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          {error && <p className="login-error">{error}</p>}

          <button type="submit" className="login-button">
            Entrar <LogIn size={20} />
          </button>
        </form>

        <div className="login-footer">
          <p>© 2026 Mente Nexus - Bem-estar Digital</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
