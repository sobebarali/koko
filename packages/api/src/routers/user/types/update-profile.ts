import type { z } from "zod";
import type { updateProfileInput } from "../validators/update-profile";
import type { PrivateProfile } from "./get-profile";

export type UpdateProfileInput = z.infer<typeof updateProfileInput>;

export type UpdateProfileOutput = {
	user: PrivateProfile;
};
