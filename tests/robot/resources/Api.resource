*** Settings ***
Library           RequestsLibrary
Resource          Common.resource


*** Variables ***
${SESSION}        together


*** Keywords ***
API Initialize
    ${base}=    Resolve Base Url
    Create Session    ${SESSION}    ${base}

GET JSON
    [Arguments]    ${path}    ${expected_status}=200
    ${resp}=    Get On Session    ${SESSION}    ${path}
    Should Be Equal As Integers    ${resp.status_code}    ${expected_status}
    ${json}=    Set Variable    ${resp.json()}
    RETURN    ${json}


