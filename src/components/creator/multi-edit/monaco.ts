/**
 * Disables Monaco workers so the editor never fetches them from a CDN, the
 * same setup the single-resource YAML view uses.
 */
export const configureMonacoEnvironment = () => {
  self.MonacoEnvironment = {
    getWorker() {
      return new Worker(
        URL.createObjectURL(
          new Blob(['self.onmessage = () => {}'], { type: 'text/javascript' })
        )
      );
    },
  };
};
