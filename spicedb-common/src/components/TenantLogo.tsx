import { faProjectDiagram } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import Avatar from '@material-ui/core/Avatar';
import { createStyles, makeStyles, Theme } from '@material-ui/core/styles';
import React from "react";
import stc from 'string-to-color';

/**
 * TenantKind holds the different kinds for a tenant.
 */
export enum TenantKind {
    DEVELOPMENT = "DEVELOPMENT",
    PRODUCTION = "PRODUCTION",
    SYSTEM = "SYSTEM"
}

/**
 * Tenant represents a single tenant under an organization.
 */
export interface Tenant {
    /**
     * id is the unique ID for the tenant.
     */
    id: string

    /**
     * slug is the unique slug for the tenant.
     */
    slug: string

    /**
     * name is the human-readable name of the tenant.
     */
    name: string

    /**
     * description is the human-readable description for the tenant.
     */
    description: string

    /**
     * kind is the kind of the tenant.
     */
    kind: TenantKind

}

interface styleProps {
    avatarColor: string
    large: boolean | undefined
    kind: TenantKind
}

const useStyles = makeStyles((theme: Theme) =>
    createStyles({
        avatar: {
            height: (props: styleProps) => props.large ? '3rem' : '1.5rem',
            width: (props: styleProps) => props.large ? '3rem' : '1.5rem',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            '& svg': {
                marginRight: 0
            },
        },
    }));

/**
 * Defines the properties for the TenantLogo.
 */
interface TenantLogoProps {
    /**
     * The tenant.
     */
    tenant: Tenant;

    /**
     * className is the custom CSS class name for this component, if any.
     */
    className?: string

    /**
     * large indicates the logo should be large.
     */
    large?: boolean
}

export default function TenantLogo(props: TenantLogoProps) {
    let avatarColor = stc(props.tenant.slug);
    const classes = useStyles({ 'avatarColor': avatarColor, 'large': props.large, 'kind': props.tenant.kind });

    return <Avatar variant="rounded" className={`${classes.avatar} ${props.className || ''}`}>
        <span style={{ color: avatarColor }}><FontAwesomeIcon icon={faProjectDiagram} size={props.large ? '1x' : 'xs'} /></span>
    </Avatar>
}