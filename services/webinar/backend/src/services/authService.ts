// Serviço de autenticação com placeholders
// Banco de dados será integrado no próximo módulo

export const authService = {
  register: async (email: string, _password: string, name: string) => {
    return {
      id: Math.random().toString(36).substr(2, 9),
      email,
      name,
      role: 'client',
      createdAt: new Date(),
    };
  },

  login: async (email: string, password: string) => {
    if (email === 'mrasnigro@gmail.com' && password === 'marcio123') {
      return {
        id: '1',
        email,
        name: 'Administrador',
        role: 'admin',
      };
    }
    throw new Error('Email ou senha inválidos');
  },

  forgotPassword: async (_email: string) => {
    return { message: 'Email de recuperação será enviado' };
  },

  resetPassword: async (_token: string, _newPassword: string) => {
    return { message: 'Senha redefinida com sucesso' };
  },

  logout: async () => {
    return { message: 'Logout realizado com sucesso' };
  },

  getMe: async (userId: string) => {
    return {
      id: userId,
      email: 'usuario@exemplo.com',
      name: 'Usuário',
      role: 'client',
    };
  },

  refresh: async (_refreshToken: string) => {
    return {
      accessToken: 'new_access_token_placeholder',
    };
  },
};
