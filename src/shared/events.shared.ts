import type { Events } from "../utils/types/Event.types";
import { EventEmitter } from "stream";

export class AppEmitter extends EventEmitter {
    constructor () {
        super();
    }

    override emit<K extends keyof Events>(event: K, payload: Events[K]): boolean {
        return super.emit(event, payload);
    };

    override on<K extends keyof Events>(event: K, listener: (payload: Events[K]) => void): this {
        return super.on(event, listener);
    }
};