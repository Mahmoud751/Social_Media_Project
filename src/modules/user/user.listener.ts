import { userRepo } from "../../shared/repos.shared";
import { AppEmitter } from '../../shared/events.shared';
import { deleteFile, getFile } from "../../utils/multer/AWS/s3.service";

const userEvent = new AppEmitter();

userEvent.on("track-profile-photo-upload", async (data) => {
    setTimeout(async () => {
        try {
            await getFile(data.key);
            if (data.oldKey) {
                await deleteFile(data.oldKey);
            }
            console.log("Photo's Upload Is Done!");
        } catch (error: any) {
            if (error.name === "NoSuchKey") {
                await userRepo.updateUser({
                    filter: { _id: data.userId },
                    updates: {
                        // Is There a Picture Already ? Replace : Remove Temporary
                        ...(data.oldKey ? { set: { picture: data.oldKey } } : { unset: { picture: true } })
                    }
                });
            }
        }
    }, data.expiresIn || Number(process.env.PRESIGNED_URL_EXPIRES_IN_SECONDS) * 1000);
});

export default userEvent;