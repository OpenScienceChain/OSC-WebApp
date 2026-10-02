[CmdletBinding()]
param(
  [string]$ApiBaseUrl = 'http://127.0.0.1:18080/api/v1'
)

$ErrorActionPreference = 'Stop'

function Invoke-JsonRequest {
  param(
    [Parameter(Mandatory)][ValidateSet('GET', 'POST')][string]$Method,
    [Parameter(Mandatory)][string]$Uri,
    [hashtable]$Headers = @{},
    [object]$Body
  )

  $parameters = @{
    Method = $Method
    Uri = $Uri
    Headers = $Headers
    ContentType = 'application/json'
  }
  if ($null -ne $Body) {
    $parameters.Body = $Body | ConvertTo-Json -Depth 12
  }
  Invoke-RestMethod @parameters
}

function Get-CollectionOrEmpty {
  param(
    [Parameter(Mandatory)][string]$Uri,
    [hashtable]$Headers = @{}
  )

  try {
    return Invoke-JsonRequest -Method GET -Uri $Uri -Headers $Headers
  } catch {
    if ([int]$_.Exception.Response.StatusCode -eq 404) {
      return @()
    }
    throw
  }
}

$login = Invoke-JsonRequest -Method POST -Uri "$ApiBaseUrl/users/login" -Body @{
  username = 'usrse26-admin'
  password = 'LocalOnly-Admin-2026'
}
$adminHeaders = @{ Authorization = "Bearer $($login.token)" }

$organizations = Get-CollectionOrEmpty -Uri "$ApiBaseUrl/organizations" -Headers $adminHeaders
$organizationDefinitions = @(
  @{
    name = 'Neuroscience Gateway'
    description = 'NSG demonstration organization for reproducible neuroscience research.'
    ledgerGroupName = 'nsg'
    ledgerApiUserId = 'nsg-portal'
    artifactSchemaName = 'nsg-artifacts'
  },
  @{
    name = 'Citizen Science'
    description = 'Demonstration organization for community-contributed datasets and observations.'
    ledgerGroupName = 'citizen-science'
    ledgerApiUserId = 'citizen-science-portal'
    artifactSchemaName = 'citizen-science-artifacts'
  }
)

foreach ($definition in $organizationDefinitions) {
  $organization = $organizations | Where-Object name -eq $definition.name | Select-Object -First 1
  if (-not $organization) {
    $organization = Invoke-JsonRequest -Method POST -Uri "$ApiBaseUrl/organizations" -Headers $adminHeaders -Body $definition
  }
  if ($definition.name -eq 'Neuroscience Gateway') {
    $nsg = $organization
  }
}

$users = Get-CollectionOrEmpty -Uri "$ApiBaseUrl/users" -Headers $adminHeaders
if (-not ($users | Where-Object username -eq 'nsg-researcher')) {
  Invoke-JsonRequest -Method POST -Uri "$ApiBaseUrl/users/register" -Headers $adminHeaders -Body @{
    name = 'NSG Demonstration Researcher'
    email = 'nsg-researcher@example.test'
    username = 'nsg-researcher'
    password = 'LocalOnly-Researcher-2026'
    role = 'pi'
    organizationId = $nsg.id
  } | Out-Null
}

$researcherLogin = Invoke-JsonRequest -Method POST -Uri "$ApiBaseUrl/users/login" -Body @{
  username = 'nsg-researcher'
  password = 'LocalOnly-Researcher-2026'
}
$researcherHeaders = @{ Authorization = "Bearer $($researcherLogin.token)" }
$artifacts = Get-CollectionOrEmpty -Uri "$ApiBaseUrl/artifacts"
$artifactTitle = 'USRSE deterministic neuroimaging fixture'
if (-not ($artifacts | Where-Object title -eq $artifactTitle)) {
  Invoke-JsonRequest -Method POST -Uri "$ApiBaseUrl/artifacts" -Headers $researcherHeaders -Body @{
    title = $artifactTitle
    description = 'A deterministic local artifact used to validate the browser to API Gateway to PostgreSQL integration path.'
    keywords = @('neuroscience', 'reproducibility', 'usrse26')
    links = @('https://www.nsgportal.org/')
    dois = @()
    fundingAgencies = @('National Science Foundation')
    acknowledgements = 'Local integration fixture; not a researcher submission.'
    manifest = @(
      @{
        filename = 'dataset_description.json'
        hash = 'f32b925cf835fd2606575a746dad693e3b1b06be81b74135ab9c8027218d63e7'
        algorithm = 'sha256'
      }
    )
    footprint = 'b731d8f7cc8d9463a5ab13c6bbef70f5103e398ad001aaf52c91a2fb94d6397e'
    submission_comment = 'Created by the disposable USRSE integration harness.'
  } | Out-Null
}

$finalArtifacts = Get-CollectionOrEmpty -Uri "$ApiBaseUrl/artifacts"
$result = $finalArtifacts |
  Where-Object title -eq $artifactTitle |
  Select-Object -First 1

if (-not $result) {
  throw 'The seeded artifact was not returned by the API Gateway.'
}

[pscustomobject]@{
  Status = 'passed'
  ArtifactId = $result.id
  Organization = 'Neuroscience Gateway'
  SubmissionState = if ($result.submissionState) { $result.submissionState } else { 'CREATED' }
  Scope = 'WebApp proxy -> API Gateway -> PostgreSQL/RabbitMQ'
}
