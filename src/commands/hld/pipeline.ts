import { logger } from "../../logger";

import { IBuildApi } from "azure-devops-node-api/BuildApi";
import commander = require("commander");
import {
  createPipelineForDefinition,
  definitionForAzureRepoPipeline,
  getBuildApiClient,
  queueBuild
} from "../../lib/pipelines/pipelines";

import { BuildDefinition } from "azure-devops-node-api/interfaces/BuildInterfaces";

/**
 * Install a HLD to Manifest pipeline. The Azure Pipelines yaml should
 * be merged into the HLD repository before this function is to be invoked.
 * @param orgUrl
 * @param personalAccessToken
 * @param repoName
 * @param repoUrl URL to the HLD repository
 * @param project
 */
export const installHldToManifestPipeline = async (
  orgUrl: string,
  personalAccessToken: string,
  repoName: string,
  repoUrl: string,
  project: string,
  exitFn: (status: number) => void
) => {
  let devopsClient;
  let builtDefinition;
  const pipelineName = "HLD to Manifest";

  try {
    devopsClient = await getBuildApiClient(orgUrl, personalAccessToken);
    logger.info("Fetched DevOps Client");
    logger.info(devopsClient!);
  } catch (err) {
    logger.error(err);
    return exitFn(1);
  }

  const definition = definitionForAzureRepoPipeline({
    branchFilters: ["master"],
    maximumConcurrentBuilds: 1,
    /* tslint:disable-next-line object-literal-shorthand */
    pipelineName: pipelineName,
    repositoryName: repoName,
    repositoryUrl: repoUrl,
    yamlFileBranch: "master",
    yamlFilePath: `azure-pipelines.yaml`
  });

  try {
    builtDefinition = await createPipelineForDefinition(
      devopsClient as IBuildApi,
      project,
      definition
    );
  } catch (err) {
    logger.error(`Error occurred during pipeline creation for ${pipelineName}`);
    logger.error(err);
    return exitFn(1);
  }

  logger.info(`Created pipeline for ${pipelineName}`);
  logger.info(builtDefinition as BuildDefinition);
  logger.info(`Pipeline ID: ${(builtDefinition as BuildDefinition).id}`);

  try {
    await queueBuild(
      devopsClient as IBuildApi,
      project,
      (builtDefinition as BuildDefinition).id as number
    );
  } catch (err) {
    logger.error(`Error occurred when queueing build for ${pipelineName}`);
    logger.error(err);
    return exitFn(1);
  }
};
