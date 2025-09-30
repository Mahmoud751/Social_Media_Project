import { AllowComments, Availability } from "../../DB/models/post.model";

export interface IUpdatePost {
    content?: string;
    availability?: Availability;
    allowComments?: AllowComments;
    tags?: string[];
    removedAttachments?: string[];
    removedTags?: string[];
};