import { GraphQLEnumType, GraphQLList, GraphQLObjectType, GraphQLString } from "graphql";
import { GraphQLDateType, GraphQLIDType, ResponseStatusType } from "./types";
import { AllowComments, Availability } from "../../../DB/models/post.model";

export const GraphQLAvailabilityEnumType = new GraphQLEnumType({
    name: "AvailabilityEnumType",
    values: {
        public: { value: Availability.public },
        friends: { value: Availability.friends },
        onlyMe: { value: Availability.onlyMe }
    }
});

export const GraphQLAllowCommentsEnumType = new GraphQLEnumType({
    name: "AllowCommentsEnumType",
    values: {
        allow: { value: AllowComments.allow },
        deny: { value: AllowComments.deny }
    }
});

export const PostGQLType = new GraphQLObjectType({
    name: "PostDocType",
    fields: {
        _id: { type: GraphQLIDType },
        content: { type: GraphQLString },
        attachments: { type: new GraphQLList(GraphQLString) },
        likes: { type: new GraphQLList(GraphQLIDType) },
        tags: { type: new GraphQLList(GraphQLIDType) },
        availability: { type: GraphQLAvailabilityEnumType },
        allowComments: { type: GraphQLAllowCommentsEnumType },
        assetFolderId: { type: GraphQLString },
        createdBy: { type: GraphQLIDType },
        freezedAt: { type: GraphQLDateType },
        freezedBy: { type: GraphQLIDType },
        restoredAt: { type: GraphQLDateType },
        restoredBy: { type: GraphQLIDType },
        createdAt: { type: GraphQLDateType },
        updatedAt: { type: GraphQLDateType }
    }
});

export const getPost = new GraphQLObjectType({
    name: "GetPostResponse",
    fields: {
        ...ResponseStatusType,
        data: {
            type: new GraphQLObjectType({
                name: "GetPostData",
                fields: {
                    post: { type: PostGQLType }
                }
            })
        }
    }
});