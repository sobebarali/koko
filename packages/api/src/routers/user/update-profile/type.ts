import type { z } from "zod";
import type { PrivateProfile } from "../get-profile/type";
import type { updateProfileInput } from "./validator";

export type UpdateProfileInput = z.infer<typeof updateProfileInput>;

export type UpdateProfileOutput = {
	user: PrivateProfile;
};
