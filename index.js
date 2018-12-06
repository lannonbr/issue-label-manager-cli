const octokit = require('@octokit/rest')
const fs = require("fs");
require('dotenv').config();

const api = new octokit()
api.authenticate({
  type: "token",
  token: process.env["GITHUB_TOKEN"]
});

let filepath = process.argv[2]
let owner = process.argv[3];
let repo = process.argv[4];

async function run() {
  // Get current labels on GitHub
  let response = await api.issues.listLabelsForRepo({
    owner,
    repo
  });
  let labels = response.data;

  // Get the labels to be pushed from the labels.json file
  let newLabels = JSON.parse(fs.readFileSync(filepath).toString());

  let indexesOfLabelsToBeRemovedFromArray = await Promise.all(
    newLabels.map(async label => {
      return new Promise(async resolve => {
        let { name, color, description } = label;

        let idx = -1;

        if (labels.length > 0) {
          idx = labels.findIndex(issue => issue.name === name);
        }

        if (idx !== -1) {
          let params = {
            owner,
            repo,
            current_name: name,
            color,
            description,
            headers: { accept: "application/vnd.github.symmetra-preview+json" }
          };
          await api.issues.updateLabel(params);
          resolve(idx);
        } else {
          let params = {
            owner,
            repo,
            name,
            color,
            description,
            headers: { accept: "application/vnd.github.symmetra-preview+json" }
          };
          await api.issues.createLabel(params);
          resolve(-1);
        }
      });
    })
  );

  // Filter labels array to include labels not defined in json file
  labels = labels.filter((_, idx) => {
    return !indexesOfLabelsToBeRemovedFromArray.includes(idx);
  });

  // Delete labels that exist on GitHub that aren't in labels.json
  labels.forEach(async label => {
    let { name } = label;

    await api.issues.deleteLabel({
      owner,
      repo,
      name
    });
  });
}

run();
