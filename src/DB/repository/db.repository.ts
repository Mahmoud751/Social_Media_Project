import type {
    CreateOptions,
    FlattenMaps,
    HydratedDocument,
    Model,
    MongooseUpdateQueryOptions,
    ProjectionType,
    QueryOptions,
    RootFilterQuery,
    UpdateQuery,
    UpdateResult,
    UpdateWithAggregationPipeline,
} from "mongoose";
import { IDType } from "../models/User.model";

export abstract class DatabaseRepository<TDocument> {
    constructor(protected readonly model: Model<TDocument>) {};
    create = async (
        data: Partial<TDocument>[],
        options?: CreateOptions | undefined
    ): Promise<HydratedDocument<TDocument>[]> => {
        return await this.model.create(data, options);
    };

    findOne = async ({
        filter,
        select,
        options
    }: {
        filter?: RootFilterQuery<TDocument>,
        select?: ProjectionType<TDocument> | undefined,
        options?: QueryOptions<TDocument> | undefined
    }): Promise<HydratedDocument<TDocument> | FlattenMaps<TDocument> & IDType | null> => {
        // const doc = this.model.findOne(filter).select(select || "");
        // if (options?.lean) {
        //     doc.lean(options.lean);
        // }
        // return await doc.exec();
        return await this.model.findOne(filter, select, options);
    };

    findById = async ({
        id,
        select,
        options
    }: {
        id: string,
        select?: ProjectionType<TDocument> | undefined,
        options?: QueryOptions<TDocument> | undefined
    }): Promise<HydratedDocument<TDocument> | FlattenMaps<TDocument> & IDType | null> => {
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
        options = { runValidators: true }
    }: {
        filter: RootFilterQuery<TDocument>,
        updates: UpdateQuery<TDocument> | UpdateWithAggregationPipeline,
        options?: MongooseUpdateQueryOptions<TDocument> | undefined
    }): Promise<UpdateResult> => {
        return this.model.updateOne(filter, { ...updates, $inc: { __v: 1 } }, { ...options, runValidators: true });
    };

    // findOneAndUpdate;

    // deleteOne;

    // findOneAndDelete;
};
