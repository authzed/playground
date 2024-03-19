/**
 * Defines the properties for a User.
 */
export interface UserProps {
    /**
     * The username of the user.
     */
    username: string;

    /**
     * The user's avatar URL, if any.
     */
    avatarUrl?: string | null;

    /**
     * The full name of the user.
     */
    fullName?: string | null;

    /**
     * The email address for the user, if any.
     */
    emailAddress?: string | null;
}