//RACES
import HUicon from '@/assets/raceIcons/HUMAN.png'
import OCicon from '@/assets/raceIcons/ORC.png'
import UDicon from '@/assets/raceIcons/UNDEAD.png'
import NEicon from '@/assets/raceIcons/NIGHT_ELF.png'
import RANDOMicon from '@/assets/raceIcons/RANDOM.png'

export const raceWrapper = {
    races: [
        {
            id: 'HU',
            name: 'Human',
            icon: HUicon
        },
        {
            id: 'OC',
            name: 'Orc',
            icon: OCicon
        },
        {
            id :'UD',
            name: 'Undead',
            icon: UDicon
        },
        {
            id :'NE',
            name: 'Night Elf',
            icon: NEicon
        },
        {
            id :'RANDOM',
            name: 'Random',
            icon: RANDOMicon
        },
    ],

    getRaceObject: ( raceID ) => {
        const currentRace = raceWrapper.races.find( ({ id }) => id === raceID );
        return currentRace
    }
}