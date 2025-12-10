import { Server } from 'socket.io';
declare const app: import("express-serve-static-core").Express;
declare const io: Server<import("socket.io").DefaultEventsMap, import("socket.io").DefaultEventsMap, import("socket.io").DefaultEventsMap, any>;
export declare const emitUrlUpdate: (urlId: string, data: any) => void;
export declare const emitExecutionStart: (urlId: string, data: any) => void;
export declare const emitExecutionComplete: (urlId: string, data: any) => void;
export declare const emitScreenshotCaptured: (urlId: string, data: any) => void;
export { app, io };
//# sourceMappingURL=app.d.ts.map