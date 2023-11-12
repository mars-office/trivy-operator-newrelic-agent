import { Request, Response, Router } from "express";
import { VulnerabilityReport } from "../models/vulnerability-report";
import { Finding, NewRelicVulnerabilityReport } from "../models/new-relic-vulnerability-report";
import axios from "axios";
import { NerdGraphResponse } from "../models/nerd-graph-response";
import { NewRelicVulnerabilityResponse } from "../models/new-relic-vulnerability-response";

const webhookRouter = Router();

webhookRouter.post("/api/webhook", async (req: Request, res: Response) => {
  if (!req.body) {
    res.status(400).send({success: false, error: "Invalid payload"});
    return;
  }
  const data: VulnerabilityReport = req.body;

  if (!data || !data.kind || data.kind.toLowerCase() !== 'vulnerabilityreport') {
    res.status(400).send({success: false, error: "Invalid payload!"});
    return;
  }

  const nerdGraphQuery = `
  query {
    actor {
      entitySearch(query: "domain='INFRA' AND type='CONTAINER' AND tags.k8s.clusterName='${data.metadata.labels.env}' AND tags.k8s.namespaceName='${data.metadata.namespace}' AND tags.k8s.${data.metadata.labels["trivy-operator.resource.kind"].toLowerCase()}Name='${data.metadata.labels["trivy-operator.resource.name"]}' AND tags.k8s.containerName='${data.metadata.labels["trivy-operator.container.name"]}'") {
        count
        results {
          entities {
            name
            guid
          }
        }
      }
    }
  }
  `;

  const nerdGraphReply = await axios.post<NerdGraphResponse>(process.env.NERD_GRAPH_URL!, {
    query: nerdGraphQuery
  }, {
    headers: {
      'Api-Key': process.env.NEW_RELIC_API_KEY!
    }
  });
  
  const newRelicPayload: NewRelicVulnerabilityReport = {
    findings: data.report?.vulnerabilities?.map(v => ({
      entityType: 'Container',
      entityGuid: nerdGraphReply.data.data.actor.entitySearch.results.entities[0].guid,
      issueId: v.vulnerabilityID,
      issueType: 'Container Vulnerability',
      message: v.description || v.title,
      severity: v.severity,
      cvssScore: v.score,
      detectedAt: Date.parse(data.report.updateTimestamp) + '',
      disclosureUrl: v.primaryLink,
      remediationExists: v.fixedVersion != null,
      remediationRecommendation: `Update ${v.resource} to version ${v.fixedVersion}`,
      source: 'trivy-operator',
      title: v.title,
      customFields: {
        cluster: data.metadata.labels.cluster,
        env: data.metadata.labels.env
      }
    } as Finding))
  };

  const newRelicReply = await axios.post<NewRelicVulnerabilityResponse>(process.env.NEW_RELIC_VULN_URL!, newRelicPayload, {
    headers: {
      'Api-Key': process.env.NEW_RELIC_INGEST_KEY!,
      'Content-Type': 'application/json'
    }
  });

  if (!newRelicReply.data.success) {
    res.status(400).send({success: false, error: newRelicReply.data.errorMessage});
    return;
  }
  console.log('Sent successfully.');
  res.send({success: true});
});

export default webhookRouter;