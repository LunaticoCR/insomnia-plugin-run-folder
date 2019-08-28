module.exports.requestGroupActions = [
  {
    label: 'Send All Requests',
    action: async (context, data) => {
      const { requests } = data;

      let results = [];
      results.push(`<tr><th>Request</th><th>Status Code</th></tr>`);
      for (const request of requests) {
        const response = await context.network.sendRequest(request);
        var color = "";
        if (response.statusCode.toString().startsWith("2")) {
          color = "#8AB46C";
        } else if (response.statusCode.toString().startsWith("4")) {
          color = "#D19A66";
        } else if (response.statusCode.toString().startsWith("5")) {
          color = "#D8696F";
        }
        results.push(`<tr><td id="td_left">${request.name}</td><td id="td_right"><font color="${color}">${response.statusCode}</font></td></tr>`);
      }

      const css = `table { margin: 0 auto 0 auto; }
                   th, .label--small, label > small { text-align: left; padding: 10px 10px 10px 15px !important; padding-bottom: none !important; font-size: 15px !important; border: 1px solid #4B505C; }
                   td { border: 1px solid #4B505C; }
                   #td_left { text-align: left; padding: 3px 40px 3px 10px; }
                   #td_right { text-align: center; padding: 3px 3px 3px 3px; }`
      const html = `<html><head><style>${css}</style></head><body><table bgcolor="#282D35">${results.join('\n')}</table></body></html>`;

      context.app.showGenericModalDialog('Results', { html });
    },
  },
];
