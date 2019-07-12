# browserd/shared

Shared functionality between the consumer and provider 🤕☁✨

![Project status](https://img.shields.io/badge/Project%20Status-Beta-green.svg)
[![Build Status](https://dev.azure.com/bengreenier/browserd/_apis/build/status/shared?branchName=master)](https://dev.azure.com/bengreenier/browserd/_build/latest?definitionId=12&branchName=master)


## Testing

How to test shared functionality. ⚙

```
# use lerna to hoist dependencies and link local dependencies
npx lerna bootstrap --hoist

# build
npx lerna run build

# test
npm run test
```

