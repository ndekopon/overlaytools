#include "main.hpp"

#include "main_window.hpp"

int APIENTRY wWinMain(HINSTANCE _instance, HINSTANCE _prev_instance, LPWSTR _cmdline, int _cmdshow)
{
    app::main_window mw(_instance);

    if (!mw.init())
    {
        return 1;
    }

    return mw.loop();
}
