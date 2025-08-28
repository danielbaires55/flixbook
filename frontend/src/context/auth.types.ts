export interface UserData {
    token: string;
    role: string;
    userId: number;
    medicoId: number | null;
    actingMedicoId?: number | null;
}

export interface AuthContextType {
    user: UserData | null;
    login: (userData: UserData) => void;
    logout: () => void;
}