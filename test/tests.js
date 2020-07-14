const chai = require('chai');
const expect = chai.expect;

const dynql = require('../dist');

const validNames = [
    'objecta',
    'something',
    'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    'seperated_name',
    'another.name',
    'utf8_1_Ђ',
    'utf8_2_Ӵ',
    'utf8_3_թ',
    'utf8_4_ࢯ',
    'utf8_5_Ꮆ',
    'utf8_6_Ṹ',
    'utf8_7_ツ',
    'utf8_8_㇎',
    'utf8_9_ꯐ',
    'utf8_10_😀',
    'weird|.chars',
];
const invalidNames = [
    '.name',
    ';name',
    '-name',
    '@include',
    '@skip',
    'fragment',
    'on',
    'aaa...test',
];

describe('isValidName', () => {
    it('checks for valid names', () => {
        validNames.forEach(name => {
            expect(dynql.isValidName(name)).to.equal(true, `"${name}" should have been valid!`);
        });
    });

    it('checks for invalid names', () => {
        invalidNames.forEach(name => {
            expect(dynql.isValidName(name)).to.equal(false, `"${name}" should have been invalid!`);
        });
    });
});

describe('getSpreadFragmentNames', () => {
    it('finds all valid spreaded fragment names', () => {
        [
            {
                definition: '{ something { ...test1 } }',
                names: ['test1'],
            },
            {
                definition: '{ something { ...test1 ...test2 } }',
                names: ['test1', 'test2'],
            },
            {
                definition: '{ something { ...test1;...test2 } }',
                names: ['test1', 'test2'],
            },
            {
                definition: '{ something { ...test1...test2 } }',
                names: ['test1', 'test2'],
            },
            {
                definition: '{ something { ... test1... test2 } }',
                names: ['test1', 'test2'],
            },
            {
                definition: '{ something { ...test.one...test.two } }',
                names: ['test.one', 'test.two'],
            },
            {
                definition: '{ something { ...test..one...test.two } }',
                names: ['test', 'test.two'],
            },
            {
                definition: `{ something { ...test1
...test2 } }`,
                names: ['test1', 'test2'],
            },
        ].forEach(item => {
            const actual = dynql.getSpreadFragmentNames(item.definition);
            expect(actual).to.deep.equal(
                item.names,
                `Definition "${item.definition}" did not give proper results!`
            );
        });
    });
});

describe('getDefinedFragmentNames',() => {
    it('finds all validly defined fragment names', () => {
        validNames.forEach(name => {
            const definition = `fragment ${name} on Something { field }`;
            const actual = dynql.getDefinedFragmentNames(definition);
            expect(actual).to.deep.equal(
                [name],
                `Definition "${definition}" did not give proper results!`
            );
        });
    });

    it('ignores invalidly defined fragment names', () => {
        invalidNames.forEach(name => {
            const definition = `fragment ${name} on Something { field }`;
            const actual = dynql.getDefinedFragmentNames(definition);
            expect(actual).to.deep.equal(
                [],
                `Definition "${definition}" did not give proper results!`
            );
        });
    });
});

describe('register', () => {
    it('should register fragments with valid names', () => {
        const store = new dynql.FragmentStore();
        validNames.forEach(name => {
            const definition = `fragment ${name} on Something { field }`;
            const result = store.registerFragment(name, definition);
            expect(result).to.be.true;
        });
    });

    it('should not register fragments with invalid names', () => {
        const store = new dynql.FragmentStore();
        invalidNames.forEach(name => {
            const definition = `fragment ${name} on Something { field }`;
            const result = store.registerFragment(name, definition);
            expect(result).to.be.false;
        });
    });
});

describe('unregister', () => {
    it('should unregister previously registered fragments', () => {
        [
            'tmp1',
            'cool1',
            'hello_world'
        ].forEach(name => {
            const store = new dynql.FragmentStore();
            const previousFragments = [
                'test1',
                'test2',
                'something1',
                'something2',
            ];
            previousFragments.forEach(prevName => {
                store.registerFragment(prevName, `fragment ${prevName} on Something { field }`);
            });
            store.registerFragment(name, `fragment ${name} on Something { field }`);
            const resolved = store.resolve(`{ test { ...${name} } }`);
            expect(resolved).not.to.be.empty;
            const response = store.unregisterFragment(name);
            expect(response).to.be.true;
            expect(function() {
                store.resolve(`{ test { ...${name} } }`);
            }).to.throw(`Could not resolve required fragment ${name}!`);
        });
    });

    it('should not unregister not yet registered fragments', () => {
        [
            'tmp1',
            'cool1',
            'hello_world'
        ].forEach(name => {
            const store = new dynql.FragmentStore();
            const previousFragments = [
                'test1',
                'test2',
                'something1',
                'something2',
            ];
            previousFragments.forEach(prevName => {
                store.registerFragment(prevName, `fragment ${prevName} on Something { field }`);
            });
            const response = store.unregisterFragment(name);
            expect(response).to.be.false;
            expect(function() {
                store.resolve(`{ test { ...${name} } }`);
            }).to.throw(`Could not resolve required fragment ${name}!`);
        });
    });
});

describe('resolve', () => {
    it('resolve regular dependencies', () => {
        const query = '{ something { ...test } }';
        const store = new dynql.FragmentStore();
        const fragment = 'fragment test on Something { foobar }';
        store.registerFragment('test', fragment);
        expect(store.resolve(query)).to.have.same.members([fragment]);
    });

    it('resolve nested dependencies', () => {
        const query = '{ something { ...level1_a ...level1_b ...level1_c } }';
        const fragments = {
            level1_a: 'fragment level1_a on foo { ...level2_a }',
            level1_b: 'fragment level1_b on foo { ...level2_a ...level2_b }',
            level1_c: 'fragment level1_c on foo { ...level3_a }',
            level2_a: 'fragment level2_a on foo { ...level3_a }',
            level2_b: 'fragment level2_b on foo { bar }',
            level3_a: 'fragment level3_a on foo { test }',
        };
        const store = new dynql.FragmentStore();
        Object.entries(fragments).forEach(([name, fragment]) => {
            store.registerFragment(name, fragment);
        });
        expect(store.resolve(query)).to.have.same.members(Object.values(fragments));
    });

    it('resolve only required dependencies', () => {
        const query = '{ something { ...level1_c } }';
        const requiredFragments = {
            level1_c: 'fragment level1_c on foo { ...level3_a }',
            level3_a: 'fragment level3_a on foo { test }',
        }
        const fragments = {
            ...requiredFragments,
            level1_a: 'fragment level1_a on foo { ...level2_a }',
            level1_b: 'fragment level1_b on foo { ...level2_a ...level2_b }',
            level2_a: 'fragment level2_a on foo { ...level3_a }',
            level2_b: 'fragment level2_b on foo { bar }',
        };
        const store = new dynql.FragmentStore();
        Object.entries(fragments).forEach(([name, fragment]) => {
            store.registerFragment(name, fragment);
        });
        expect(store.resolve(query)).to.have.same.members(Object.values(requiredFragments));
    });

    it('resolve not yet defined dependencies', () => {
        const query = '{ something { ...level1_a ...level1_b ...level1_c } } fragment level1_a on bla { test }';
        const requiredFragments = {
            level1_b: 'fragment level1_b on foo { ...level2_b }',
            level1_c: 'fragment level1_c on foo { ...level3_a }',
            level2_b: 'fragment level2_b on foo { bar }',
            level3_a: 'fragment level3_a on foo { test }',
        };
        const fragments = {
            ...requiredFragments,
            level1_a: 'fragment level1_a on foo { ...level2_a }',
            level2_a: 'fragment level2_a on foo { ...level3_a }',
        };
        const store = new dynql.FragmentStore();
        Object.entries(fragments).forEach(([name, fragment]) => {
            store.registerFragment(name, fragment);
        });
        expect(store.resolve(query)).to.have.same.members(Object.values(requiredFragments));
    });

    it('throw an error when it can\'t resole a required fragment', () => {
        const store = new dynql.FragmentStore();
        expect(() => {
            store.resolve('{ something { ...foo } }');
        }).to.throw('Could not resolve required fragment foo!');
    })
});
