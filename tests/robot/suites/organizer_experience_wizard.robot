*** Settings ***
Resource          ../resources/Common.resource
Suite Setup       Common Suite Setup
Suite Teardown    Common Suite Teardown
Test Setup        Common Test Setup
Test Teardown     Common Test Teardown


*** Test Cases ***
Organizer can create a draft experience via wizard
    # Login as organizer (quick-fill)
    Go To Path    /login
    Wait For Selector    xpath=//button[normalize-space(.)='Organizer']
    Click    xpath=//button[normalize-space(.)='Organizer']
    Click    xpath=//button[normalize-space(.)='Sign in']

    # Create a unique title to avoid collisions across runs
    ${rand}=    Evaluate    __import__('random').randint(1000, 9999)
    ${title}=    Set Variable    Test Experience (Robot ${rand})

    # Go to organizer console overview
    Go To Path    /dashboard/organizer
    Wait For Text    Overview

    # Go to experiences list in console
    Click    xpath=//a[normalize-space(.)='Manage experiences']
    Wait For Text    Experiences

    # Open the Add Experience modal / wizard
    Click    xpath=//button[normalize-space(.)='Add new experience']
    Wait For Text    Basic info
    Wait For Selector    xpath=//div[@role='dialog' and @aria-modal='true']

    # STEP 1: Basic info
    Fill    xpath=//div[@role='dialog' and @aria-modal='true']//label[contains(normalize-space(.), 'Experience title')]/following::input[1]    ${title}
    Fill    xpath=//div[@role='dialog' and @aria-modal='true']//label[contains(normalize-space(.), 'Short summary')]/following::input[1]    A short summary for the robot-generated experience.
    ${desc}=    Set Variable    This is a long detailed description used by Robot Framework to satisfy the minimum length requirement. It explains the flow, expectations, highlights, safety, logistics, and value proposition for guests. It exceeds two hundred characters to meet validation and allows us to proceed to the next step of the wizard without errors.
    Fill    xpath=//div[@role='dialog' and @aria-modal='true']//label[contains(normalize-space(.), 'Detailed description')]/following::textarea[1]    ${desc}
    # Select first available category (skip placeholder)
    Wait For Selector    xpath=//div[@role='dialog' and @aria-modal='true']//label[contains(normalize-space(.), 'Category')]/following::select[1]
    Select Options By    xpath=//div[@role='dialog' and @aria-modal='true']//label[contains(normalize-space(.), 'Category')]/following::select[1]    index    1
    Fill    xpath=//div[@role='dialog' and @aria-modal='true']//label[contains(normalize-space(.), 'Price per spot')]/following::input[1]    50
    # Duration: 0 days, 1 hour, 0 min
    Select Options By    xpath=//div[@role='dialog' and @aria-modal='true']//label[contains(normalize-space(.), 'Duration')]/following::select[1]    value    0
    Select Options By    xpath=//div[@role='dialog' and @aria-modal='true']//label[contains(normalize-space(.), 'Duration')]/following::select[2]    value    1
    Select Options By    xpath=//div[@role='dialog' and @aria-modal='true']//label[contains(normalize-space(.), 'Duration')]/following::select[3]    value    0
    Click    xpath=//button[normalize-space(.)='Next']

    # STEP 2: Visuals (upload hero + at least 5 gallery images)
    Wait For Text    Featured image
    ${img}=    Asset Image Path    exp-placeholder.png
    Set Files    xpath=//div[@role='dialog' and @aria-modal='true']//input[@id='hero-image']    ${img}
    Set Files    xpath=//div[@role='dialog' and @aria-modal='true']//input[@id='gallery-images']    ${img}    ${img}    ${img}    ${img}    ${img}
    # Ensure gallery count reflects 5 images before moving on
    Wait For Text    5 / 12 images
    Click    xpath=//button[normalize-space(.)='Next']

    # STEP 3: Itinerary — add 3 activities with image, subtitle, and duration
    Wait For Text    Activity 1
    # Activity 1
    Wait For Selector    xpath=//div[@role='dialog' and @aria-modal='true']//h3[normalize-space(.)='Activity 1']/ancestor::div[contains(@class,'sm:flex-row')][1]/div[2]//label[contains(normalize-space(.), 'Title')]/following::input[1]
    Fill    xpath=//div[@role='dialog' and @aria-modal='true']//h3[normalize-space(.)='Activity 1']/ancestor::div[contains(@class,'sm:flex-row')][1]/div[2]//label[contains(normalize-space(.), 'Title')]/following::input[1]    Introduction and welcome
    Fill    xpath=//div[@role='dialog' and @aria-modal='true']//h3[normalize-space(.)='Activity 1']/ancestor::div[contains(@class,'sm:flex-row')][1]/div[2]//label[contains(normalize-space(.), 'Subtitle')]/following::input[1]    Safety briefing and overview
    Set Files    xpath=//div[@role='dialog' and @aria-modal='true']//h3[normalize-space(.)='Activity 1']/ancestor::div[contains(@class,'sm:flex-row')][1]//input[starts-with(@id,'itinerary-image-')]    ${img}
    # Duration 0h 30m (hours select is first, minutes select is second within each activity)
    Select Options By    xpath=//div[@role='dialog' and @aria-modal='true']//h3[normalize-space(.)='Activity 1']/ancestor::div[contains(@class,'sm:flex-row')][1]/div[2]//label[contains(normalize-space(.), 'Duration')]/following::select[1]    value    0
    Select Options By    xpath=//div[@role='dialog' and @aria-modal='true']//h3[normalize-space(.)='Activity 1']/ancestor::div[contains(@class,'sm:flex-row')][1]/div[2]//label[contains(normalize-space(.), 'Duration')]/following::select[2]    value    30
    
    # Add Activity 2 and Activity 3
    Click    xpath=//div[@role='dialog' and @aria-modal='true']//button[normalize-space(.)='Add activity']
    Click    xpath=//div[@role='dialog' and @aria-modal='true']//button[normalize-space(.)='Add activity']
    Wait For Text    Activity 3
    
    # Activity 2
    Wait For Selector    xpath=//div[@role='dialog' and @aria-modal='true']//h3[normalize-space(.)='Activity 2']/ancestor::div[contains(@class,'sm:flex-row')][1]/div[2]//label[contains(normalize-space(.), 'Title')]/following::input[1]
    Fill    xpath=//div[@role='dialog' and @aria-modal='true']//h3[normalize-space(.)='Activity 2']/ancestor::div[contains(@class,'sm:flex-row')][1]/div[2]//label[contains(normalize-space(.), 'Title')]/following::input[1]    Hands-on practice
    Fill    xpath=//div[@role='dialog' and @aria-modal='true']//h3[normalize-space(.)='Activity 2']/ancestor::div[contains(@class,'sm:flex-row')][1]/div[2]//label[contains(normalize-space(.), 'Subtitle')]/following::input[1]    Guided participation with instructor tips
    Set Files    xpath=//div[@role='dialog' and @aria-modal='true']//h3[normalize-space(.)='Activity 2']/ancestor::div[contains(@class,'sm:flex-row')][1]//input[starts-with(@id,'itinerary-image-')]    ${img}
    # Duration 1h 0m
    Select Options By    xpath=//div[@role='dialog' and @aria-modal='true']//h3[normalize-space(.)='Activity 2']/ancestor::div[contains(@class,'sm:flex-row')][1]/div[2]//label[contains(normalize-space(.), 'Duration')]/following::select[1]    value    1
    Select Options By    xpath=//div[@role='dialog' and @aria-modal='true']//h3[normalize-space(.)='Activity 2']/ancestor::div[contains(@class,'sm:flex-row')][1]/div[2]//label[contains(normalize-space(.), 'Duration')]/following::select[2]    value    0
    
    # Activity 3
    Wait For Selector    xpath=//div[@role='dialog' and @aria-modal='true']//h3[normalize-space(.)='Activity 3']/ancestor::div[contains(@class,'sm:flex-row')][1]/div[2]//label[contains(normalize-space(.), 'Title')]/following::input[1]
    Fill    xpath=//div[@role='dialog' and @aria-modal='true']//h3[normalize-space(.)='Activity 3']/ancestor::div[contains(@class,'sm:flex-row')][1]/div[2]//label[contains(normalize-space(.), 'Title')]/following::input[1]    Q&A and wrap-up
    Fill    xpath=//div[@role='dialog' and @aria-modal='true']//h3[normalize-space(.)='Activity 3']/ancestor::div[contains(@class,'sm:flex-row')][1]/div[2]//label[contains(normalize-space(.), 'Subtitle')]/following::input[1]    Feedback and next steps
    Set Files    xpath=//div[@role='dialog' and @aria-modal='true']//h3[normalize-space(.)='Activity 3']/ancestor::div[contains(@class,'sm:flex-row')][1]//input[starts-with(@id,'itinerary-image-')]    ${img}
    # Duration 0h 45m
    Select Options By    xpath=//div[@role='dialog' and @aria-modal='true']//h3[normalize-space(.)='Activity 3']/ancestor::div[contains(@class,'sm:flex-row')][1]/div[2]//label[contains(normalize-space(.), 'Duration')]/following::select[1]    value    0
    Select Options By    xpath=//div[@role='dialog' and @aria-modal='true']//h3[normalize-space(.)='Activity 3']/ancestor::div[contains(@class,'sm:flex-row')][1]/div[2]//label[contains(normalize-space(.), 'Duration')]/following::select[2]    value    45
    
    Click    xpath=//button[normalize-space(.)='Next']

    # STEP 4: Meeting point (address, country/state/city, coordinates)
    Wait For Text    Meeting point
    Fill    xpath=//div[@role='dialog' and @aria-modal='true']//label[contains(normalize-space(.), 'Address')]/following::input[1]    123 Test Street
    # Country (and optionally State) then City: pick first available option beyond placeholder
    Wait For Selector    xpath=//div[@role='dialog' and @aria-modal='true']//label[contains(normalize-space(.), 'Country')]/following::select[1]
    Select Options By    xpath=//div[@role='dialog' and @aria-modal='true']//label[contains(normalize-space(.), 'Country')]/following::select[1]    index    1
    Pause
    # State may be disabled/absent depending on country
    ${_status}    ${_res}=    Run Keyword And Ignore Error    Select Options By    xpath=//div[@role='dialog' and @aria-modal='true']//label[contains(normalize-space(.), 'State/Region')]/following::select[1]    index    1
    Pause
    Select Options By    xpath=//div[@role='dialog' and @aria-modal='true']//label[contains(normalize-space(.), 'City')]/following::select[1]    index    1
    # Set coordinates by clicking the map container
    Click    xpath=(//div[@role='dialog' and @aria-modal='true']//div[contains(@class,'rounded-xl') and contains(@class,'border')]/descendant::div[contains(@class,'absolute') and contains(@class,'inset-0')])[1]
    Click    xpath=//button[normalize-space(.)='Next']

    # STEP 5: Sessions — create 3 sessions and configure per-session overrides
    Wait For Text    Sessions
    # Add 2 sessions (total 3): next day and then next session
    Click    xpath=//div[@role='dialog' and @aria-modal='true']//button[normalize-space(.)='Add next day (same time)']
    Click    xpath=//div[@role='dialog' and @aria-modal='true']//button[normalize-space(.)='Add next session']
    # Ensure 3 session containers exist before proceeding
    Wait For Selector    xpath=(//div[@role='dialog' and @aria-modal='true']//div[starts-with(@id,'session-')])[3]
    
    # Expand Session 1 and set different location
    Wait For Selector    xpath=(//div[@role='dialog' and @aria-modal='true']//div[starts-with(@id,'session-')])[1]//button[@aria-expanded='false']
    Click    xpath=(//div[@role='dialog' and @aria-modal='true']//div[starts-with(@id,'session-')])[1]//button[@aria-expanded='false']
    Click    xpath=(//div[@role='dialog' and @aria-modal='true']//div[starts-with(@id,'session-')])[1]//div[.//div[normalize-space(.)='Use different location for this session']]//button[@role='switch']
    Fill     xpath=(//div[@role='dialog' and @aria-modal='true']//div[starts-with(@id,'session-')])[1]//label[normalize-space(.)='Session address']/following::textarea[1]    456 Alternate Venue Road
    # Set coordinates by clicking the session map container
    Click    xpath=(//div[@role='dialog' and @aria-modal='true']//div[starts-with(@id,'session-')])[1]//div[contains(@class,'rounded-xl') and contains(@class,'border')]//div[contains(@class,'absolute') and contains(@class,'inset-0')]
    
    # Expand Session 2 and set different price
    Wait For Selector    xpath=(//div[@role='dialog' and @aria-modal='true']//div[starts-with(@id,'session-')])[2]//button[@aria-expanded='false']
    Click    xpath=(//div[@role='dialog' and @aria-modal='true']//div[starts-with(@id,'session-')])[2]//button[@aria-expanded='false']
    Click    xpath=(//div[@role='dialog' and @aria-modal='true']//div[starts-with(@id,'session-')])[2]//div[.//div[normalize-space(.)='Use different price for this session']]//button[@role='switch']
    Fill     xpath=(//div[@role='dialog' and @aria-modal='true']//div[starts-with(@id,'session-')])[2]//label[normalize-space(.)='Price override']/following::input[1]    75
    
    # Expand Session 3 and set different duration (2h 30m)
    Wait For Selector    xpath=(//div[@role='dialog' and @aria-modal='true']//div[starts-with(@id,'session-')])[3]//button[@aria-expanded='false']
    Click    xpath=(//div[@role='dialog' and @aria-modal='true']//div[starts-with(@id,'session-')])[3]//button[@aria-expanded='false']
    Click    xpath=(//div[@role='dialog' and @aria-modal='true']//div[starts-with(@id,'session-')])[3]//div[.//div[normalize-space(.)='Use different duration for this session']]//button[@role='switch']
    Select Options By    xpath=(//div[@role='dialog' and @aria-modal='true']//div[starts-with(@id,'session-')])[3]//label[normalize-space(.)='Session duration']/following::select[1]    value    2
    Select Options By    xpath=(//div[@role='dialog' and @aria-modal='true']//div[starts-with(@id,'session-')])[3]//label[normalize-space(.)='Session duration']/following::select[2]    value    30
    
    # Save as draft
    Click    xpath=//div[@role='dialog' and @aria-modal='true']//button[normalize-space(.)='Save draft']

    # Verify we are back on the organizer experiences list and the new draft is visible
    Wait For Text    Experiences
    Wait For Selector    xpath=//h3[normalize-space(.)='${title}']

    # Assert the status control for this card is set to Draft
    ${status_value}=    Get Property    xpath=//h3[normalize-space(.)='${title}']/ancestor::div[contains(@class,'Card') or contains(@class,'rounded')][1]//select[@name='nextStatus']    value
    Should Be Equal As Strings    ${status_value}    DRAFT

    # Open Edit modal for this experience and verify persisted fields across steps
    Click    xpath=//h3[normalize-space(.)='${title}']/ancestor::div[contains(@class,'Card') or contains(@class,'rounded')][1]//button[@aria-label='Edit details']
    Wait For Selector    xpath=//div[@role='dialog' and @aria-modal='true']
    Wait For Text    Basic info
    # Title persisted
    ${title_val}=    Get Property    xpath=//div[@role='dialog' and @aria-modal='true']//label[contains(normalize-space(.), 'Experience title')]/following::input[1]    value
    Should Be Equal As Strings    ${title_val}    ${title}
    # Price persisted
    ${price_val}=    Get Property    xpath=//div[@role='dialog' and @aria-modal='true']//label[contains(normalize-space(.), 'Price per spot')]/following::input[1]    value
    Should Contain    ${price_val}    50
    # Duration persisted (1 hour)
    ${dur_hours}=    Get Property    xpath=//div[@role='dialog' and @aria-modal='true']//label[contains(normalize-space(.), 'Duration')]/following::select[2]    value
    Should Be Equal As Strings    ${dur_hours}    1
    Click    xpath=//button[normalize-space(.)='Next']

    # Visuals step: hero preview present and gallery count still 5
    Wait For Text    Featured image
    Wait For Text    5 / 12 images
    Click    xpath=//button[normalize-space(.)='Next']

    # Itinerary step: first activity title persisted
    Wait For Text    Activity 1
    ${act1}=    Get Property    xpath=(//div[@role='dialog' and @aria-modal='true']//label[contains(normalize-space(.), 'Title')]/following::input)[1]    value
    Should Be Equal As Strings    ${act1}    Introduction and welcome
    Click    xpath=//button[normalize-space(.)='Next']

    # Meeting point step: address persisted
    Wait For Text    Meeting point
    ${addr}=    Get Property    xpath=//div[@role='dialog' and @aria-modal='true']//label[contains(normalize-space(.), 'Address')]/following::input[1]    value
    Should Be Equal As Strings    ${addr}    123 Test Street
    Click    xpath=//button[normalize-space(.)='Next']

    # Sessions step: verify summary shows 3 sessions and save draft again
    Wait For Text    Sessions
    Wait For Text    3 /
    Click    xpath=//div[@role='dialog' and @aria-modal='true']//button[normalize-space(.)='Save draft']

    # Cleanup: archive the created draft so it doesn't pollute future runs
    Wait For Text    Experiences
    Select Options By    xpath=//h3[normalize-space(.)='${title}']/ancestor::div[contains(@class,'Card') or contains(@class,'rounded')][1]//select[@name='nextStatus']    value    ARCHIVED
    # Confirm UI reflects Archived selection
    ${arch_val}=    Get Property    xpath=//h3[normalize-space(.)='${title}']/ancestor::div[contains(@class,'Card') or contains(@class,'rounded')][1]//select[@name='nextStatus']    value
    Should Be Equal As Strings    ${arch_val}    ARCHIVED
    # Verify presence in archived list
    Go To Path    /dashboard/organizer/experiences/archived
    Wait For Text    Archived experiences
    Wait For Selector    xpath=//h3[normalize-space(.)='${title}']

