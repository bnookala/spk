import fs from "fs";
import yaml from "js-yaml";
import path from "path";

import commander = require("commander");
import { logger } from "../../logger";

import {
  createPipelineForDefinition,
  definitionForAzureRepoPipeline,
  getBuildApiClient,
  queueBuild
} from "../../lib/pipelines/pipelines";
import { IBedrockFile } from "../../types";
import { ProcessCustomizationType } from "azure-devops-node-api/interfaces/CoreInterfaces";
import { IBuildApi } from "azure-devops-node-api/BuildApi";

export const createPipelineCommandDecorator = (
  command: commander.Command
): void => {
  command
    .command("create-pipeline <service-name>")
    .alias("p")
    .description("Configure Azure DevOps for a bedrock managed service")
    .option(
      "-n, --pipeline-name <pipeline-name>",
      "Name of the pipeline to be created"
    )
    .option(
      "-p, --personal-access-token <personal-access-token>",
      "Personal Access Token"
    )
    .option("-o, --org-url <org-url>", "Organization URL for Azure DevOps")
    .option("-r, --repo-name <repo-name>", "Repository Name in Azure DevOps")
    .option("-u, --repo-url <repo-url>", "Repository URL")
    .option("-d, --devops-project <devops-project>", "Azure DevOps Project")
    .option("-l, --project-path <project-path>", "Path to Bedrock Project")
    .action(async (serviceName, opts) => {
      const {
        pipelineName,
        personalAccessToken,
        orgUrl,
        repoName,
        repoUrl,
        devopsProject,
        projectPath
      } = opts;

      try {
        if (typeof pipelineName !== "string") {
          throw new Error(
            `pipelineName must be of type 'string', ${typeof pipelineName} given.`
          );
        }

        if (typeof personalAccessToken !== "string") {
          throw new Error(
            `personalAccessToken must be of type 'string', ${typeof personalAccessToken} given.`
          );
        }

        if (typeof orgUrl !== "string") {
          throw new Error(
            `orgUrl must be of type 'string', ${typeof orgUrl} given.`
          );
        }

        if (typeof repoName !== "string") {
          throw new Error(
            `repoName must be of type 'string', ${typeof repoName} given.`
          );
        }

        if (typeof repoUrl !== "string") {
          throw new Error(
            `repoUrl must be of type 'string', ${typeof repoUrl} given.`
          );
        }

        if (typeof devopsProject !== "string") {
          throw new Error(
            `project must be of type 'string', ${typeof devopsProject} given.`
          );
        }

        if (typeof projectPath !== "string") {
          throw new Error(
            `projectPath must be of type 'string', ${typeof projectPath} given.`
          );
        }
      } catch (err) {
        logger.error(`Error occurred validating inputs for ${serviceName}`);
        logger.error(err);
        process.exit(1);
      }

      try {
        //const absProjectPath = path.resolve(projectPath);
        await installPipeline(
          serviceName,
          orgUrl,
          personalAccessToken,
          pipelineName,
          repoName,
          repoUrl,
          devopsProject,
          projectPath
        );
      } catch (err) {
        logger.error(`Error occured installing pipeline for ${serviceName}`);
        logger.error(err);
        process.exit(1);
      }
    });
};

/**
 *
 * @param serviceName
 * @param orgUrl
 * @param personalAccessToken
 * @param pipelineName
 * @param repoName
 * @param repoUrl
 * @param project
 * @param projectPath
 */
export const installPipeline = async (
  serviceName: string,
  orgUrl: string,
  personalAccessToken: string,
  pipelineName: string,
  repoName: string,
  repoUrl: string,
  project: string,
  projectPath: string
) => {
  /**
  const bedrockManagedServices = readBedrockConfig(projectPath);
  if (!ensureServiceExistence(serviceName, bedrockManagedServices)) {
    logger.error(`service ${serviceName} not found in bedrock config - has it been created and merged?`);
    return;
  }*/

  let devopsClient;

  try {
    devopsClient = await getBuildApiClient(orgUrl, personalAccessToken);
  } catch (err) {
    logger.error("wtf");
    console.log(err);
    process.exit(1);
  }

  const definition = definitionForAzureRepoPipeline({
    branchFilters: ["master"],
    maximumConcurrentBuilds: 1,
    /* tslint:disable-next-line object-literal-shorthand */
    pipelineName: pipelineName,
    repositoryName: repoName,
    repositoryUrl: repoUrl,
    yamlFileBranch: "master",
    yamlFilePath: `packages/${serviceName}/azure-pipelines.yaml`
  });

  try {
    const builtDefinition = await createPipelineForDefinition(
      devopsClient as IBuildApi,
      project,
      definition
    );
    await queueBuild(
      devopsClient as IBuildApi,
      project,
      builtDefinition.id as number
    );
  } catch (err) {
    logger.error(`Error occured during pipeline creation for ${pipelineName}`);
    logger.error(err);
  }
};

const readBedrockConfig = (bedrockPath: string): IBedrockFile => {
  const bedrockFile = yaml.safeLoad(
    fs.readFileSync(bedrockPath, { encoding: "utf8" })
  ) as IBedrockFile;

  return bedrockFile;
};

/**
 *
 * @param serviceName
 * @param bedrockManagedServices
 */
export const ensureServiceExistence = (
  serviceName: any,
  bedrockManagedServices: IBedrockFile
): boolean => {
  if (typeof serviceName !== "string") {
    throw new Error(
      `serviceName must be of type 'string', ${typeof serviceName} given.`
    );
  }

  // TODO ensure service existence
  //
  // if (!bedrockManagedServices.includes(serviceName)) {
  //   return false;
  // }

  return true;
};
