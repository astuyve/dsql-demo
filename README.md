# DSQL Demo

This is a simple DSQL demo combined with Datadog APM.

You can remove Datadog by commenting out the serverless plugin in `serverless.yml` and removing the `dd-trace` & `tracer` bits in the handler.

Deploy with `DD_API_KEY=<your_api_key> DSQL_ENDPOINT=<your_dsql_endpoint> serverless deploy`.
