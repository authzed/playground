/**
 * User initiated events.
 * Event names generally follow the format: present-tense verb + object syntax
 */
export enum UserEvent {
    ClickShare = 'Click Playground Share',
    ClickLoadExample = 'Click Playground Load Example',
    ClickValidation = 'Click Playground Validation',
    ClickDownload = 'Click Playground Download',
    ClickUpload= 'Click Playground Upload',
    ClickAddCheck = 'Click Playground Add Check',
    ViewTab = 'View Playground Tab',
    ViewPanel = 'View Playground Panel',
    // Guided Tour
    StartTour = 'Start Step',
    ViewTourStep = 'View Tour Step',
    CompleteTour = 'Complete Tour',
    SkipTour = 'Skip Tour',
}
