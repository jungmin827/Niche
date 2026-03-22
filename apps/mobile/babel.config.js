module.exports = function (api) {
  api.cache(true);

  const importMetaCompatPlugin = ({ types: t }) => ({
    name: 'import-meta-compat',
    visitor: {
      MetaProperty(path) {
        if (path.node.meta.name !== 'import' || path.node.property.name !== 'meta') {
          return;
        }

        path.replaceWith(
          t.objectExpression([
            t.objectProperty(
              t.identifier('env'),
              t.objectExpression([
                t.objectProperty(
                  t.identifier('MODE'),
                  t.memberExpression(
                    t.memberExpression(t.identifier('process'), t.identifier('env')),
                    t.identifier('NODE_ENV'),
                  ),
                ),
              ]),
            ),
          ]),
        );
      },
    },
  });

  return {
    presets: ['babel-preset-expo', 'nativewind/babel'],
    plugins: [importMetaCompatPlugin],
  };
};
