interface ParsedFragment {
    definition: string,
    dependsOn: string[];
}

interface Fragment {
    name: string;
    definition?: string;
}

const fragmentName = `[_a-zA-Z][_a-zA-Z0-9]+`;
const nameBlacklist = ['on'];
const validFragmentName = new RegExp(`^(${fragmentName})$`, 'g');
const fragmentSpreadName = new RegExp(`\\.{3}\\s*(${fragmentName})`, 'g');
const fragmentDefinitionName =
    new RegExp(`(?:^|[\\W])fragment[\\s]+(${fragmentName})[\\s]+on[\\s]+${fragmentName}`, 'g');

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
 * a spread definition (`...`<fragment_name>`)
 *
 * @param definition The definition in which should be searched for
 *
 * @returns An string array of found and validly spread fragment names
 */
export function getSpreadFragmentNames(definition: string): string[] {
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
export function getDefinedFragmentNames(definition: string): string[] {
    // Reset the index
    fragmentDefinitionName.lastIndex = 0;
    const matches = definition.matchAll(fragmentDefinitionName);
    const names: string[] = [];

    for (const match of matches) {
        if (isValidName(match[1])) {
            names.push(match[1]);
        }
    }

    return names;
}

/**
 * Helper function to find all fragments inside of a GraphQL Query and
 * returns them. Used for auto-registering them into the store.
 * 
 * @param query The GraphQL Query which contains fragments you want to extract
 * @returns A map of all detected fragment-names and it's content 
 */
export function findFragmentsFromQuery(query: string) {
    const out: { [name: string]: string } = {};

    let offset = 0;
    let buffer = '';
    let level = 0;

    for (let index = 0; index < query.length; index++) {
        if (query[index] === '{') {
            if (level === 0) {
                buffer = query.slice(offset, index - 1).trim();
            }
            level++;
        } else if (query[index] === '}') {
            level--;
            if (level === 0) {
                // Reset the index from previous match
                fragmentDefinitionName.lastIndex = 0;
                const match = fragmentDefinitionName.exec(buffer);
                if (match != null) {
                    out[match[1]] = query.slice(offset, index + 1).trim();
                }
                offset = index + 1;
                buffer = '';
            }
        }
    }

    return out;
}

/**
 * An error which is thrown when the FragmentStore could not resolve
 * an required fragment.
 */
export class UnresolvedFragmentError extends Error { }

/**
 * A store to store fragments in to later resolve them dynamically in a query.
 */
export class FragmentStore {
    /**
     * Internal store of all fragments
     */
    private store: { [name: string]: ParsedFragment; } = {};

    /**
     * @returns All currently saved fragments in this store
     */
    public getFragments() {
        const out = {};

        Object.keys(this.store).forEach(name => {
            out[name] = this.store[name].definition;
        });

        return out;
    }

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
     * Function which automatically finds all fragments in the provided
     * query and registers them.
     * All names from the found fragments are returned at the end.
     * 
     * @param query GraphQL Query/Content with fragments
     * 
     * @returns The names of all detected and registered fragments
     */
    public autoRegisterFragment(query: string): string[] {
        const found = findFragmentsFromQuery(query);
        const names = Object.keys(found);

        names.forEach(name => {
            this.registerFragment(name, found[name]);
        });

        return names;
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

    /**
     * Attempts to resolve the fragments from `toResolve` and its potential
     * required fragments which are not present yet.
     * Careful, as it modifies the provided `resolvedFragments` array!
     *
     * @param toResolve The names of the Fragments which need to be loaded
     * @param resolvedFragments The already present/resolved fragments
     *
     * @returns All resolved Fragments
     * @throws An `UnresolvedFragmentError` When a required fragment could
     *  not be found in the store
     */
    private resolveFragments(
        toResolve: string[],
        resolvedFragments: Fragment[] = []
    ): Fragment[] {
        toResolve.forEach(fragmentName => {
            // Check if it's already resolved
            if (resolvedFragments.findIndex(fragment =>
                fragment.name === fragmentName) !== -1
            ) {
                return;
            }

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

            if (
                fragment.dependsOn != null
                && fragment.dependsOn.length > 0
            ) {
                this.resolveFragments(
                    fragment.dependsOn,
                    resolvedFragments
                );
            }
        });

        return resolvedFragments;
    }
}
