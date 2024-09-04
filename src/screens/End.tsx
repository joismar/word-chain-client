import { Avatar } from "@src/components/Avatar";
import { BorderShadow } from "@src/components/BorderShadow";
import { Letter } from "@src/components/Letter";
import { Word } from "@src/components/Word";
import { useGameBlocContext } from "@src/providers/GameBlocProvider";
import { getCSSPlayerColor } from "@src/utils/helpers";
import { Distance } from "@src/utils/types";

// const gameData = {
//     players: [
//         {
//             id: 'dasda',
//             name: 'teco',
//             score: 23,
//             color: 2,
//         },
//         {
//             id: 'kfrefok',
//             name: 'nay',
//             score: 42,
//             color: 5,
//         },
//         {
//             id: 'kmwkmse',
//             name: 'chupeta',
//             score: 102,
//             color: 4,
//         },
//         {
//             id: 'fref',
//             name: 'lele',
//             score: 57,
//             color: 3,
//         },
//     ]
// }

export function End() {
    const { gameData } = useGameBlocContext();

    gameData.players?.sort((a, b) => b.score - a.score);

    function getPlayerDistance(index: number) {
        if (index > 2) return 4
        return index + 2 as Distance;
    }

    function onRestart() {
        location.reload()
    }

    return (
        <div className=" w-full h-full flex flex-col justify-between items-center gap-5 py-5">
            <Word color="bg-orange-800">FIM</Word>
            <div className="flex flex-col flex-1 gap-2 w-full">
                <div className="border-t border-neutral-600 my-2 w-[100%]"></div>
                {gameData.players?.map((player, i) => (
                    <div className="flex justify-between w-full gap-1" key={player.id}>
                        <div className='w-9 flex justify-end pr-1'>
                            <Avatar distance={getPlayerDistance(i)} color={getCSSPlayerColor(player.color)} />
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <Word distance={getPlayerDistance(i)}>{player.name}</Word>
                        </div>
                        <BorderShadow
                            size="64px"
                            direction="l"
                            className="z-[10]"
                            isVisible
                        />
                        <Letter distance={getPlayerDistance(i)}>
                            {player.score.toString()}
                        </Letter>
                    </div>
                ))}
                <div className="border-t border-neutral-600 my-2 w-[100%]"></div>
            </div>
            <Word onClick={onRestart} distance={3} className="group cursor-pointer" letterClassName="bg-teal-800 group-hover:bg-teal-700">REINICIAR</Word>
        </div>
    )
}