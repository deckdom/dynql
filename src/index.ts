interface ParsedFragment {
    definition: string,
    dependsOn: string[];
}

interface Fragment {
    name: string;
    definition?: string;
}

const validNameRegex = /^([_a-zA-Z]+[\w.]*)$/u;

export function isValidName(name: string): boolean {
    return validNameRegex.test(name) && !["on", "fragment"].includes(name.toLocaleLowerCase());
}

export function getFragmentNames(definition: string): string[] {
    const matches = definition.matchAll(/\.{3}\s*([_a-zA-Z]+[\w.]*)/gu);
    const dependencies: string[] = [];

    for (const match of matches) {
        const name = match[1];
        if (isValidName(name) && !dependencies.includes(name)) {
            dependencies.push(name);
        }
    }

    return dependencies;
}

export function getDefinedFragmentNames(definition: string): string[] {
    const names: string[] = [];
    const matches = definition.matchAll(/[\W](?:fragment[\s]([_a-zA-Z]+[\w.]*)[\s]+)/gu);
    for (const match of matches) {
        names.push(match[1]);
    }
    return names;
}

/**
 * A store to store fragments in to later resolve them dynamically in a query.
 */
export class FragmentStore {
    private store: { [name: string]: ParsedFragment; } = {};

    /**
     * Analyzes the provided query and loads the required fragments
     * from the store (if available).
     * Returns a string-array with the missing fragment definitions.
     * 
     * @param query The query into which fragments should be loaded into
     * 
     * @return An array of missing fragment definitions which need to be added to the query
     * @throws When a required fragment could not be found in the store
     */
    public resolve(query: string): string[] {
        const definedFragments = getDefinedFragmentNames(query);
        
        const requiredFragments = getFragmentNames(query)
            .filter(name => !definedFragments.includes(name));

        const resolvedFragments = this.resolveFragments(
            requiredFragments,
            definedFragments.map(name => ({ name }))
        );

        return resolvedFragments
            .map(fragment => fragment.definition)
            .filter(definition => definition != null) as string[];
    }

    /**
     * Attempts to resolve the fragments from `toResolve` and its potential
     * required fragments which are not present yet.
     * Careful, as it modifies the provided `resolvedFragments` array!
     * 
     * @param toResolve The names of the Fragments which need to be loaded
     * @param resolvedFragments The already present/resolved fragments
     * 
     * @returns All resolved Fragments
     * @throws When a required fragment could not be found in the store
     */
    private resolveFragments(toResolve: string[], resolvedFragments: Fragment[] = []): Fragment[] {
        const newDependencies: string[] = [];

        for (let i = 0; i < toResolve.length; i++) {
            const fragmentName = toResolve[i];
            const fragment = this.store[fragmentName];
            if (fragment == null) {
                throw new Error(`Could not resolve required fragment ${fragmentName}!`);
            }

            resolvedFragments.push({ name: fragmentName, definition: fragment.definition });
            newDependencies.push(...fragment.dependsOn);
        }

        const unresolvedFragments = newDependencies
            .filter(element =>
                !resolvedFragments
                    .map(fragment => fragment.name)
                    .includes(element)
            );

        if (unresolvedFragments.length > 0) {
            resolvedFragments.push(...this.resolveFragments(unresolvedFragments, resolvedFragments));
        }

        return resolvedFragments;
    }

    /**
     * Registers the Fragment to the store
     * 
     * @param name Name of the fragment to register
     * @param definition The whole defition of the fragment
     * 
     * @returns If the fragment has successfully been added
     */
    public registerFragment(name: string, definition: string) {
        if (!isValidName(name)) {
            return false;
        }

        this.store[name] = {
            definition,
            dependsOn: getFragmentNames(definition),
        };

        return true;
    }

    /**
     * Removes the specified Fragment from the store.
     * 
     * @param name The name of the fragment which should be removed
     * 
     * @returns If the fragment was present and has been removed
     */
    public unregisterFragment(name: string) {
        if (this.store[name]) {
            delete this.store[name];
            return true;
        }

        return false;
    }
}