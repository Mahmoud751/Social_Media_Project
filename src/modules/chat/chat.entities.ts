import { ChatDoc, ChatDocLean } from "../../utils/types/mongoose.types";

export interface IGetChatResponse {
    chat: Partial<ChatDoc | ChatDocLean>;
};