import {writable, derived, get} from 'svelte/store'
import {translations} from './locales'

export const locale = writable('en')

const localizedDictionary = derived(locale, $locale => translations[$locale])

export const t = derived(localizedDictionary, $localizedDictionary => {
	return (path) => getEntryReduce(path, $localizedDictionary)
})

function getEntryReduce(path, dictionary) {
	const keys = path.split('.')
	return keys.reduce((dict, key) => dict[key], dictionary)
}

// alternative to using reduce
function getEntryRecursive(path, dictionary) {
	if(typeof dictionary !== 'object') {
		return dictionary
	} else {
		const keys = path.split('.')
		const nextKey = keys[0]
		const remainingPath = keys.slice(1).join('.')
		const subDict = dictionary[nextKey]
		return getEntryRecursive(remainingPath, subDict)
	}
}