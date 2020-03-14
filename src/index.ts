interface ParsedFragment {
    definition: string,
    dependsOn: string[];
}

interface Fragment {
    name: string;
    definition?: string;
}

const fragmentName = '([_a-zA-Z]+[\\w\\p{L}\\p{S}\\p{N}\\.]*)';
const nameBlacklist = ['on', 'fragment'];
const validFragmentName = new RegExp(`^${fragmentName}$`, 'gu');
const fragmentSpreadName = new RegExp(`\.{3}\s*${fragmentName}`, 'gu');
const fragmentDefinitionName =
    new RegExp(`[\W](?:fragment[\s]${fragmentName}[\s]+)`, 'gu');

/**
 * Helper function to determine if a fragment name is valid.
 *
 * @param name The name of a fragment
 *
 * @returns If the name is valid
 */
export function isValidName(name: string): boolean {
    // Reset the index
    validFragmentName.lastIndex = 0;

    return validFragmentName.test(name)
        && !nameBlacklist.includes(name.toLocaleLowerCase());
}

/**
 * Helper function to get all fragment names which are used in
 * a a spread definition (`...`<fragment_name>`)
 *
 * @param definition The definition in which should be searched for
 *
 * @returns An string array of found and validly spread fragment names
 */
function getSpreadFragmentNames(definition: string): string[] {
    // Reset the index
    fragmentSpreadName.lastIndex = 0;
    const matches = definition.matchAll(fragmentSpreadName);
    const dependencies: string[] = [];

    for (const match of matches) {
        const name = match[1];
        if (isValidName(name) && !dependencies.includes(name)) {
            dependencies.push(name);
        }
    }

    return dependencies;
}


/**
 * Helper function to get all fragment name which are definied
 * in the definition.
 *
 * @param definition The definition in which fragments are defined
 *
 * @returns An string array of defined fragment names
 */
function getDefinedFragmentNames(definition: string): string[] {
    // Reset the index
    fragmentDefinitionName.lastIndex = 0;
    const matches = definition.matchAll(fragmentDefinitionName);
    const names: string[] = [];

    for (const match of matches) {
        names.push(match[1]);
    }

    return names;
}

/**
 * An error which is thrown when the FragmentStore could not resolve
 * an required fragment.
 */
export class UnresolvedFragmentError extends Error {}

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
     * @return An array of missing fragment definitions which need to be added
     *      to the query
     * @throws An `UnresolvedFragmentError` When a required fragment could not
     *      be found in the store
     */
    public resolve(query: string): string[] {
        const definedFragments = getDefinedFragmentNames(query);

        const requiredFragments = getSpreadFragmentNames(query)
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
     * @throws An `UnresolvedFragmentError` When a required fragment could not
     *      be found in the store
     */
    private resolveFragments(
        toResolve: string[],
        resolvedFragments: Fragment[] = []
    ): Fragment[] {
        const newDependencies: string[] = [];

        for (let i = 0; i < toResolve.length; i++) {
            const fragmentName = toResolve[i];
            const fragment = this.store[fragmentName];
            if (fragment == null) {
                throw new UnresolvedFragmentError(
                    `Could not resolve required fragment ${fragmentName}!`
                );
            }

            resolvedFragments.push({
                name: fragmentName,
                definition: fragment.definition,
            });
            newDependencies.push(...fragment.dependsOn);
        }

        const unresolvedFragments = newDependencies
            .filter(element =>
                !resolvedFragments
                    .map(fragment => fragment.name)
                    .includes(element)
            );

        if (unresolvedFragments.length > 0) {
            resolvedFragments.push(...this.resolveFragments(
                unresolvedFragments,
                resolvedFragments
            ));
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
            dependsOn: getSpreadFragmentNames(definition),
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
