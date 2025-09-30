import type {
    IDType,
    Doc,
    LeanDoc,
    FilterType,
    SelectionType,
    OptionsType,
    UpdateOptionsType,
    DeletionOptionsType,
    UpdateType,
    DeleteResultType,
    UpdateResultType,
    CreateOptionsType,
    PaginatedDocType
} from "../../utils/types/mongoose.types";
import {
    type Model,
    type UpdateWithAggregationPipeline,
    Types,
} from "mongoose";
import { ApplicationException } from "../../utils/response/error.response";

export abstract class DatabaseRepository<TDocument> {
    constructor(protected readonly model: Model<TDocument>) {};
    create = async (
        data: Partial<TDocument>[],
        options?: CreateOptionsType
    ): Promise<Doc<TDocument>[]> => {
        if (!Object.keys(data).length) {
            throw new ApplicationException("Data Is Required!");
        }
        return await this.model.create(data, options);
    };

    createId = (id: string): Types.ObjectId => {
        return Types.ObjectId.createFromHexString(id);
    };

    find = async (
        filter?: FilterType<TDocument>,
        select?: SelectionType<TDocument>,
        options?: OptionsType<TDocument>
    ): Promise<Doc<TDocument>[] | LeanDoc<TDocument>[]> => {
        const doc = this.model.find(filter ?? {}, select ?? {}, { paranoid: true, lean: true, ...options });
        return await doc.exec();
    };

    findPaginatedDocs = async ({
        filter,
        select,
        options = {},
        page = 1,
        size = 5,
        all = "false"
    }: {
        filter: FilterType<TDocument>,
        select?: SelectionType<TDocument>,
        options?: OptionsType<TDocument>,
        page?: number | undefined,
        size?: number | undefined,
        all?: string
    }): Promise<PaginatedDocType<TDocument>> => {
        let docsCount: number | undefined = undefined;
        let pages: number | undefined = undefined;
        if (all === "false") {
            page = Math.floor(page < 1 ? 1 : page);
            options.limit = Math.floor(size < 1 ? 5 : size);
            options.skip = (page - 1) * size;
            docsCount = await this.model.countDocuments(filter);
            pages = Math.ceil(docsCount / options.limit);
        }

        const result = await this.model.find(filter, select, { paranoid: true, lean: true, ...options });
        return {
            docsCount: docsCount || result.length,
            pages: pages || 1,
            limit: options.limit || result.length,
            documents: result
        };
    };

    findOne = async (
        filter: FilterType<TDocument>,
        select?: SelectionType<TDocument>,
        options?: OptionsType<TDocument>
    ): Promise<Doc<TDocument> | LeanDoc<TDocument> | null> => {
        if (!Object.keys(filter).length) {
            throw new ApplicationException("Filter Is Required!");
        }
        return await this.model.findOne(filter, select ?? {}, { paranoid: true, lean: true, ...options });
    };

    findById = async (
        id: IDType,
        select?: SelectionType<TDocument>,
        options?: OptionsType<TDocument>
    ): Promise<Doc<TDocument> | LeanDoc<TDocument> | null> => {
        if (!Object.keys(id).length) {
            throw new ApplicationException("Filter Is Required!");
        }
        return await this.model.findById(id, select ?? {}, { paranoid: true, lean: true, ...options });
    };

    updateOne = async (
        filter: FilterType<TDocument>,
        updates: UpdateType<TDocument> | UpdateWithAggregationPipeline,
        options?: UpdateOptionsType<TDocument>
    ): Promise<UpdateResultType> => {
        if (Array.isArray(updates)) {
            updates.push({ $set: { __v: { $add: ["$__v", 1 ] } } });
        }
        if (!Object.keys(filter).length || !Object.keys(updates).length) {
            throw new ApplicationException("Filter Or Updates Is Required!");
        }
        return this.model.updateOne(filter, updates, { paranoid: true, runValidators: true, ...options });
    };

    findByIdAndUpdate = async (
        id: IDType,
        updates: UpdateType<TDocument>,
        options?: UpdateOptionsType<TDocument> & { lean?: boolean }
    ): Promise<Doc<TDocument> | LeanDoc<TDocument> | null> => {
        if (!Object.keys(id).length || !Object.keys(updates).length) {
            throw new ApplicationException("Filter Or Updates Is Required!");
        }
        return await this.model.findByIdAndUpdate(id, {
            ...updates,
            $inc: { __v: 1 }
        }, {
            paranoid: true,
            new: true,
            lean: true,
            runValidators: true,
            ...options,
        });
    };

    findOneAndUpdate = async (
        filter: FilterType<TDocument>,
        updates: UpdateType<TDocument>,
        options?: UpdateOptionsType<TDocument> & { lean?: boolean }
    ): Promise<Doc<TDocument> | LeanDoc<TDocument> | null> => {
        if (!Object.keys(filter).length || !Object.keys(updates).length) {
            throw new ApplicationException("Filter Or Updates Is Required!");
        }
        return await this.model.findOneAndUpdate(filter, {
            ...updates,
            $inc: { __v: 1 }
        }, {
            new: true,
            lean: true,
            paranoid: true,
            runValidators: true,
            ...options
        });
    };

    deleteOne = async (
        filter: FilterType<TDocument>,
        options?: DeletionOptionsType<TDocument>
    ): Promise<DeleteResultType> => {
        if (!Object.keys(filter).length) {
            throw new ApplicationException("Filter Is Required!");
        }
        return this.model.deleteOne(filter, options);
    };

    deleteMany = async (
        filter: FilterType<TDocument>,
        options?: DeletionOptionsType<TDocument>
    ): Promise<DeleteResultType> => {
        if (!Object.keys(filter).length) {
            throw new ApplicationException("Filter Is Required!");
        }
        return this.model.deleteMany(filter, options);
    };

    findOneAndDelete = async (
        filter: FilterType<TDocument>,
        options?: DeletionOptionsType<TDocument>
    ): Promise<Doc<TDocument> | LeanDoc<TDocument> | null> => {
        if (!Object.keys(filter).length) {
            throw new ApplicationException("Filter Is Required!");
        }
        return await this.model.findOneAndDelete(filter, options);
    };
};
