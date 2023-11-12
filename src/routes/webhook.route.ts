import { Request, Response, Router } from "express";
import { VulnerabilityReport } from "../models/vulnerability-report";
import { Finding, NewRelicVulnerabilityReport } from "../models/new-relic-vulnerability-report";
import axios from "axios";

const webhookRouter = Router();

webhookRouter.post("/api/webhook", async (req: Request, res: Response) => {
  if (!req.body) {
    res.status(400).send({success: false, error: "Invalid payload"});
    return;
  }
  const data: VulnerabilityReport = req.body;

  const nerdGraphQuery = `
  query {
    actor {
      entitySearch(query: "domain='INFRA' AND type='CONTAINER' AND tags.k8s.clusterName='dev' AND tags.k8s.namespaceName='huna'") {
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

  const nerdGraphReply = await axios.post(process.env.NERD_GRAPH_URL!, {
    query: nerdGraphQuery
  }, {
    headers: {
      'Api-Key': process.env.NEW_RELIC_API_KEY!
    }
  });

 console.log(nerdGraphReply.data);
  
  const newRelicPayload: NewRelicVulnerabilityReport = {
    findings: data.report?.vulnerabilities?.map(v => ({
      entityType: 'Container',
      entityGuid: 'xxxxx',
      issueID: v.vulnerabilityID,
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


  res.send("Test OK 3333");
});

export default webhookRouter;