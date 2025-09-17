import type {
    BufferToBinary,
    CreateOptions,
    DeleteResult,
    FlattenMaps,
    HydratedDocument,
    Model,
    MongooseBaseQueryOptions,
    MongooseUpdateQueryOptions,
    ProjectionType,
    QueryOptions,
    Require_id,
    RootFilterQuery,
    UpdateQuery,
    UpdateResult,
    UpdateWithAggregationPipeline,
} from "mongoose";
import { IDType } from "../models/User.model";

export type LeanDoc<TDocument> = Require_id<FlattenMaps<BufferToBinary<TDocument>>>;
export type Doc<TDocument> = HydratedDocument<TDocument>;

export abstract class DatabaseRepository<TDocument> {
    constructor(protected readonly model: Model<TDocument>) {};
    create = async (
        data: Partial<TDocument>[],
        options: CreateOptions | undefined
    ): Promise<Doc<TDocument>[]> => {
        return await this.model.create(data, options);
    };

    findOne = async ({
        filter,
        select,
        options
    }: {
        filter: RootFilterQuery<TDocument>,
        select?: ProjectionType<TDocument> | null | undefined,
        options?: QueryOptions<TDocument> | undefined
    }): Promise<Doc<TDocument> | LeanDoc<TDocument> | null> => {
        // const doc = this.model.findOne(filter).select(select || "");
        // if (options?.lean) {
        //     doc.lean(options.lean);
        // }
        // return await doc.exec();
        return (await this.model.findOne(filter, select, options).lean());
    };

    findById = async ({
        id,
        select,
        options
    }: {
        id: IDType,
        select?: ProjectionType<TDocument> | undefined,
        options?: QueryOptions<TDocument> | undefined
    }): Promise<Doc<TDocument> | LeanDoc<TDocument> | null> => {
        // const doc = this.model.findById(id, select, options);
        // if (options?.lean) {
        //     doc.lean(options.lean);
        // }
        // return await doc.exec();
        return await this.model.findById(id, select, options);
    };

    updateOne = async ({
        filter,
        updates,
        options
    }: {
        filter: RootFilterQuery<TDocument>,
        updates: UpdateQuery<TDocument> | UpdateWithAggregationPipeline,
        options?: MongooseUpdateQueryOptions<TDocument> | undefined
    }): Promise<UpdateResult> => {
        return this.model.updateOne(filter, { ...updates, $inc: { __v: 1 } }, { ...options, runValidators: true });
    };

    findByIdAndUpdate = async ({
        id,
        updates,
        options = { runValidators: true }
    }: {
        id: IDType,
        updates: UpdateQuery<TDocument>,
        options?: MongooseUpdateQueryOptions | null
    }): Promise<Doc<TDocument> | LeanDoc<TDocument> | null> => {
        return await this.model.findByIdAndUpdate(id, { ...updates, $inc: { __v: 1 } }, options);
    };

    findOneAndUpdate = async ({
        filter,
        updates,
        options = { runValidators: true }
    }: {
        filter: RootFilterQuery<TDocument>,
        updates: UpdateQuery<TDocument>,
        options?: MongooseUpdateQueryOptions | undefined
    }): Promise<Doc<TDocument> | LeanDoc<TDocument> | null> => {
        return await this.model.findOneAndUpdate(filter, { ...updates, $inc: { __v: 1 } }, options).lean();
    };

    deleteOne = async ({
        filter,
        options,
    }: {
        filter: RootFilterQuery<TDocument>,
        options?: MongooseBaseQueryOptions | undefined
    }): Promise<DeleteResult> => {
        return this.model.deleteOne(filter, options);
    };

    // findOneAndDelete;
};
