*** Settings ***
Library           Browser
Library           OperatingSystem


*** Variables ***
${HEADLESS}       ${FALSE}
${BASE_URL}       ${EMPTY}
${DEFAULT_URL}    http://localhost:3000
${SLOWMO}          150ms
${STEP_DELAY}      1.5s
${TEARDOWN_DELAY}  1.5s


*** Keywords ***
Resolve Base Url
    ${env_url}=    Get Environment Variable    BASE_URL
    IF    '${env_url}' == ''
        ${env_url}=    Set Variable    ${DEFAULT_URL}
    END
    RETURN    ${env_url}

Common Suite Setup
    ${resolved}=    Resolve Base Url
    Set Suite Variable    ${BASE_URL}    ${resolved}
    ${is_local}=    Run Keyword And Return Status    Should Contain    ${BASE_URL}    localhost
    IF    ${is_local}
        ${HEADLESS}=    Set Variable    ${FALSE}
    END
    New Browser    chromium    headless=${HEADLESS}    slowMo=${SLOWMO}
    New Context    ignoreHTTPSErrors=${TRUE}    viewport=${NONE}
    Set Browser Timeout    30s

Common Test Setup
    New Page    ${BASE_URL}
    Take Screenshot
    Pause

Resolve Project Root
    ${root}=    Normalize Path    ${CURDIR}/../../..
    RETURN    ${root}

Build Project Path
    [Arguments]    ${relative}
    ${root}=    Resolve Project Root
    ${full}=    Normalize Path    ${root}/${relative}
    RETURN    ${full}

Asset Image Path
    [Arguments]    ${filename}
    ${path}=    Build Project Path    public/images/${filename}
    RETURN    ${path}

Common Suite Teardown
    Sleep    ${TEARDOWN_DELAY}
    Close Browser

Go To Path
    [Arguments]    ${path}
    ${target}=    Set Variable    ${BASE_URL}${path}
    Go To    ${target}
    Take Screenshot
    Pause

Wait For Text
    [Arguments]    ${text}    ${timeout}=15s
    # Playwright text selector
    Wait For Elements State    xpath=(//*[contains(normalize-space(), "${text}")])[1]    visible    ${timeout}
    Take Screenshot
    Pause

Wait For Selector
    [Arguments]    ${selector}    ${timeout}=15s
    Wait For Elements State    ${selector}    visible    ${timeout}
    Take Screenshot
    Pause

Click
    [Arguments]    ${selector}
    Browser.Click    ${selector}
    Take Screenshot
    Pause

Go To
    [Arguments]    ${url}
    Browser.Go To    ${url}
    Take Screenshot
    Pause

Fill
    [Arguments]    ${selector}    ${value}
    Browser.Fill Text    ${selector}    ${value}
    Take Screenshot
    Pause

Set Files
    [Arguments]    ${selector}    @{paths}
    Wait For Elements State    ${selector}    attached    15s
    ${status}    ${_}=    Run Keyword And Ignore Error    Set Input Files    ${selector}    @{paths}
    IF    '${status}' == 'FAIL'
        ${status}    ${_}=    Run Keyword And Ignore Error    Set File Input Files    ${selector}    @{paths}
    END
    IF    '${status}' == 'FAIL'
        # Fallback: some Browser library versions only support single-file upload per call.
        # Loop through paths and upload one by one; the component clears the input after each change,
        # so this accumulates files in the UI state correctly.
        FOR    ${p}    IN    @{paths}
            ${single_status}    ${_}=    Run Keyword And Ignore Error    Upload File By Selector    ${selector}    ${p}
            IF    '${single_status}' == 'FAIL'
                Fail    Could not upload file: ${p}
            END
        END
        ${status}=    Set Variable    PASS
    END
    Take Screenshot
    Pause

Common Test Teardown
    Take Screenshot
    Pause

Pause
    Sleep    ${STEP_DELAY}


