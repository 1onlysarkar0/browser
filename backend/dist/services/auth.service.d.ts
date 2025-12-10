export declare class AuthService {
    register(email: string, password: string): Promise<{
        user: {
            id: string;
            email: string;
        };
        token: string;
    }>;
    login(email: string, password: string): Promise<{
        requires2FA: boolean;
        userId: string;
        user?: undefined;
        token?: undefined;
    } | {
        user: {
            id: string;
            email: string;
        };
        token: string;
        requires2FA?: undefined;
        userId?: undefined;
    }>;
    verify2FA(userId: string, code: string): Promise<{
        user: {
            id: string;
            email: string;
        };
        token: string;
    }>;
    setup2FA(userId: string): Promise<{
        secret: string;
        qrCode: string;
        backupCodes: string[];
    }>;
    enable2FA(userId: string, code: string): Promise<{
        success: boolean;
    }>;
    disable2FA(userId: string, code: string): Promise<{
        success: boolean;
    }>;
    getBackupCodes(userId: string): Promise<any>;
    logout(token: string): Promise<{
        success: boolean;
    }>;
    validateSession(token: string): Promise<{
        id: string;
        email: string;
    } | null>;
    getUser(userId: string): Promise<{
        id: string;
        email: string;
        twoFactorEnabled: boolean;
        createdAt: Date;
    } | null>;
    private generateToken;
    private createSession;
}
export declare const authService: AuthService;
//# sourceMappingURL=auth.service.d.ts.map